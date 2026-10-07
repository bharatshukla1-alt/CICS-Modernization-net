// Thin CLI wrapper around db-adapters's DB adapter classes (pg / sqlite3 / mysql2 / mssql
// already installed under db-adapters/node_modules). No MCP protocol, no running
// server process — just a direct call into the same adapter classes, invoked one process
// per command from an agent's Bash tool.
//
// Credentials are read from environment variables only, never from argv (avoids leaking
// into shell history / process listings). Dialect and the operation are the only CLI flags.
//
// Usage:
//   node tools/db-apply.js --dialect <postgresql|sqlite|mysql|sqlserver|oracle> --create-database
//   node tools/db-apply.js --dialect <...> --sql-file <path/to/file.sql>
//   node tools/db-apply.js --dialect <...> --list-tables
//   node tools/db-apply.js --dialect <...> --describe-table <tableName>
//   node tools/db-apply.js --dialect <...> --query "<sql>"
//
// --query runs one ad-hoc statement (SELECT, or a write with rows to inspect) and prints
// the result rows as JSON — the direct-script replacement for an MCP read_query/write_query.
//
// --dialect also accepts the plain tech-stack-mapping names used in Config/Config.md
// (Postgres, MySQL, SQL Server, SQLite, Oracle) — normalized case/whitespace-insensitively.
//
// Env vars (all optional except what the dialect needs):
//   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD   -- postgresql / mysql / sqlserver / oracle
//   DB_FILE                                            -- sqlite (path to the .db file)
//   DB_CONNECT_STRING                                  -- oracle only, optional: a full Oracle
//                                                          connect string (TNS alias, RAC, or
//                                                          SID-style `host:port:SID`) that
//                                                          overrides the host/port/DB_NAME
//                                                          Easy Connect string db-apply.mjs
//                                                          would otherwise build.
//
// sqlite only: every connection this script opens against the target database runs
// `PRAGMA foreign_keys = ON` first — SQLite does not persist that setting in the file
// itself, so FK enforcement would silently be off otherwise.
//
// oracle only: --create-database always fails — Oracle has no per-session CREATE DATABASE;
// a DBA must pre-provision the schema/user out of band (see createDatabase() below for the
// exact statement to hand them). Also, oracledb's execute() runs one statement at a time, so
// --sql-file / a multi-statement --query is split on top-level `;` before being applied.
//
// Exit code 0 = success, 1 = failure (message on stderr). --list-tables / --describe-table /
// --query print a JSON array of rows on stdout.

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapterUrl = pathToFileURL(
  join(__dirname, '..', 'db-adapters', 'dist', 'src', 'db', 'adapter.js')
).href;
const { createDbAdapter } = await import(adapterUrl);

function parseArgs(argv) {
  const args = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dialect') args.dialect = argv[++i];
    else if (a === '--sql-file') args.sqlFile = argv[++i];
    else if (a === '--describe-table') args.tableName = argv[++i];
    else if (a === '--query') args.query = argv[++i];
    else if (a === '--create-database') args.flags.add('create-database');
    else if (a === '--list-tables') args.flags.add('list-tables');
    else throw new Error(`Unrecognized argument: ${a}`);
  }
  if (args.dialect) args.dialect = args.dialect.trim().toLowerCase().replace(/\s+/g, '');
  return args;
}

function targetConnectionInfo(dialect) {
  if (dialect === 'sqlite') {
    if (!process.env.DB_FILE) throw new Error('DB_FILE is required for --dialect sqlite');
    return process.env.DB_FILE;
  }
  const base = {
    host: process.env.DB_HOST,
    server: process.env.DB_HOST, // sqlserver adapter reads .server, not .host
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING, // oracle only; ignored by other adapters
  };
  if (!base.database) throw new Error('DB_NAME is required for --dialect ' + dialect);
  return base;
}

// Maintenance-connection info for --create-database: same credentials, but pointed at a
// database that is guaranteed to exist (or, for mysql, no database at all) so the CREATE
// DATABASE statement isn't run inside the very database it's trying to create.
function maintenanceConnectionInfo(dialect) {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (dialect === 'postgresql' || dialect === 'postgres') {
    return { host, port, user, password, database: 'postgres' };
  }
  if (dialect === 'sqlserver') {
    return { server: host, port, user, password, database: 'master' };
  }
  if (dialect === 'mysql') {
    return { host, port, user, password }; // no database key -> server-level connection
  }
  throw new Error(`--create-database has no maintenance connection for dialect ${dialect}`);
}

function quoteIdentifier(dialect, name) {
  if (dialect === 'postgresql' || dialect === 'postgres' || dialect === 'oracle') return `"${name}"`;
  if (dialect === 'mysql') return `\`${name}\``;
  if (dialect === 'sqlserver') return `[${name}]`;
  throw new Error(`No identifier quoting rule for dialect ${dialect}`);
}

async function createDatabase(dialect) {
  if (dialect === 'sqlite') {
    console.log('[db-apply] sqlite has no separate create-database step — the file is created on first open.');
    return;
  }
  const dbName = process.env.DB_NAME;
  if (dialect === 'oracle') {
    // Oracle has no per-session CREATE DATABASE — the unit this workbench calls a "database"
    // maps to an Oracle schema/user, which only a DBA (or a SYSDBA connection this script
    // never holds) can provision. Fail loud with the exact statement to hand them, rather
    // than attempting something that would just error out cryptically.
    throw new Error(
      `Oracle has no --create-database equivalent. Have a DBA run, once, connected as a ` +
      `privileged account:\n` +
      `  CREATE USER ${dbName || '<DB_NAME>'} IDENTIFIED BY <password>;\n` +
      `  GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE, ` +
      `UNLIMITED TABLESPACE TO ${dbName || '<DB_NAME>'};\n` +
      `Then set DB_USER=${dbName || '<DB_NAME>'} (Oracle schema == connecting user) and ` +
      `DB_PASSWORD to that password, and re-run this group's provisioning starting at --sql-file.`
    );
  }
  if (!dbName) throw new Error('DB_NAME is required for --create-database');
  const adapter = createDbAdapter(dialect, maintenanceConnectionInfo(dialect));
  await adapter.init();
  try {
    const id = quoteIdentifier(dialect, dbName);
    if (dialect === 'postgresql' || dialect === 'postgres') {
      try {
        await adapter.exec(`CREATE DATABASE ${id}`);
      } catch (err) {
        if (!/already exists/i.test(err.message)) throw err;
        console.log(`[db-apply] database ${dbName} already exists — leaving as-is.`);
        return;
      }
    } else if (dialect === 'mysql') {
      await adapter.exec(`CREATE DATABASE IF NOT EXISTS ${id}`);
    } else if (dialect === 'sqlserver') {
      await adapter.exec(`IF DB_ID(N'${dbName}') IS NULL CREATE DATABASE ${id}`);
    }
    console.log(`[db-apply] database ${dbName} ready.`);
  } finally {
    await adapter.close();
  }
}

// SQLite only enforces foreign keys when a connection explicitly turns it on — it is not
// a database-level setting, so every fresh connection (one per CLI invocation here) needs
// this before running any DDL/DML, regardless of what the caller's own SQL does or doesn't say.
async function openTargetAdapter(dialect) {
  const adapter = createDbAdapter(dialect, targetConnectionInfo(dialect));
  await adapter.init();
  if (dialect === 'sqlite') await adapter.exec('PRAGMA foreign_keys = ON');
  return adapter;
}

async function applySqlFile(dialect, sqlFile) {
  const sql = readFileSync(sqlFile, 'utf8');
  const adapter = await openTargetAdapter(dialect);
  try {
    await adapter.exec(sql);
    console.log(`[db-apply] applied ${sqlFile}`);
  } finally {
    await adapter.close();
  }
}

async function listTables(dialect) {
  const adapter = await openTargetAdapter(dialect);
  try {
    const rows = await adapter.all(adapter.getListTablesQuery());
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await adapter.close();
  }
}

async function describeTable(dialect, tableName) {
  const adapter = await openTargetAdapter(dialect);
  try {
    const rows = await adapter.all(adapter.getDescribeTableQuery(tableName));
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await adapter.close();
  }
}

async function runQuery(dialect, query) {
  const adapter = await openTargetAdapter(dialect);
  try {
    const rows = await adapter.all(query);
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await adapter.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dialect) throw new Error('--dialect is required');

  if (args.flags.has('create-database')) return createDatabase(args.dialect);
  if (args.sqlFile) return applySqlFile(args.dialect, args.sqlFile);
  if (args.flags.has('list-tables')) return listTables(args.dialect);
  if (args.tableName) return describeTable(args.dialect, args.tableName);
  if (args.query) return runQuery(args.dialect, args.query);

  throw new Error('No operation given — pass one of --create-database, --sql-file, --list-tables, --describe-table, --query');
}

main().catch((err) => {
  console.error(`[db-apply] ERROR: ${err.message}`);
  process.exit(1);
});
