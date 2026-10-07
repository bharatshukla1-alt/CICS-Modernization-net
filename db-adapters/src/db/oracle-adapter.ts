import { DbAdapter } from "./adapter.js";
import oracledb from "oracledb";
import assert from "node:assert";
import { pathToFileURL } from "node:url";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/**
 * Oracle database adapter implementation.
 * Uses node-oracledb's default "thin" mode — pure JS, no Oracle Instant Client install needed.
 */
export class OracleAdapter implements DbAdapter {
  private connection: oracledb.Connection | null = null;
  private connectString: string;
  private database: string;
  private user?: string;
  private password?: string;

  constructor(connectionInfo: {
    host: string;
    database: string;
    user?: string;
    password?: string;
    port?: number;
    connectString?: string;
  }) {
    this.database = connectionInfo.database;
    this.user = connectionInfo.user;
    this.password = connectionInfo.password;
    // Easy Connect syntax by default (host:port/service_name). DB_CONNECT_STRING (passed
    // through as connectionInfo.connectString) overrides this entirely for SID-style,
    // TNS-alias, or RAC connect strings a host/port/service triple can't express.
    this.connectString = connectionInfo.connectString
      || `${connectionInfo.host}:${connectionInfo.port || 1521}/${connectionInfo.database}`;
  }

  /**
   * Open the Oracle connection
   */
  async init(): Promise<void> {
    try {
      console.error(`[INFO] Connecting to Oracle: ${this.connectString}`);
      this.connection = await oracledb.getConnection({
        user: this.user,
        password: this.password,
        connectString: this.connectString,
      });
      console.error(`[INFO] Oracle connection established successfully`);
    } catch (err) {
      throw new Error(`Failed to connect to Oracle: ${(err as Error).message}`);
    }
  }

  /**
   * Execute a SQL query and get all results
   */
  async all(query: string, params: any[] = []): Promise<any[]> {
    if (!this.connection) {
      throw new Error("Database not initialized");
    }
    try {
      const result = await this.connection.execute(query, params, { autoCommit: true });
      return result.rows || [];
    } catch (err) {
      throw new Error(`Oracle query error: ${(err as Error).message}`);
    }
  }

  /**
   * Execute a SQL query that modifies data
   */
  async run(query: string, params: any[] = []): Promise<{ changes: number, lastID: number }> {
    if (!this.connection) {
      throw new Error("Database not initialized");
    }
    try {
      const result = await this.connection.execute(query, params, { autoCommit: true });
      return { changes: result.rowsAffected || 0, lastID: 0 };
    } catch (err) {
      throw new Error(`Oracle query error: ${(err as Error).message}`);
    }
  }

  /**
   * Execute multiple SQL statements.
   *
   * Unlike pg/mysql2/mssql/sqlite3, node-oracledb's execute() runs exactly one statement —
   * there is no native multi-statement batch call. This splits the incoming script on
   * top-level `;` terminators (ignoring semicolons inside quoted strings or comments) and
   * runs each statement in turn, auto-committing each one (DDL implicitly commits in Oracle
   * regardless; explicit autoCommit covers the seed-data INSERTs).
   */
  async exec(query: string): Promise<void> {
    if (!this.connection) {
      throw new Error("Database not initialized");
    }
    const statements = splitSqlStatements(query);
    try {
      for (const statement of statements) {
        await this.connection.execute(statement, [], { autoCommit: true });
      }
    } catch (err) {
      throw new Error(`Oracle batch error: ${(err as Error).message}`);
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  /**
   * Get database metadata
   */
  getMetadata(): { name: string; type: string; server: string; database: string } {
    return {
      name: "Oracle",
      type: "oracle",
      server: this.connectString,
      database: this.database,
    };
  }

  /**
   * Get database-specific query for listing tables.
   * Oracle's per-connection "schema" (the connecting user) is this workbench's stand-in for
   * a DB2 database/MySQL database — user_tables lists exactly the tables owned by that schema.
   */
  getListTablesQuery(): string {
    return "SELECT table_name AS name FROM user_tables ORDER BY table_name";
  }

  /**
   * Get database-specific query for describing a table.
   * Oracle's data dictionary stores unquoted identifiers upper-cased, so the lookup upper-cases
   * the supplied table name to match.
   */
  getDescribeTableQuery(tableName: string): string {
    return `
      SELECT
        utc.column_name AS name,
        utc.data_type AS type,
        CASE WHEN utc.nullable = 'N' THEN 1 ELSE 0 END AS notnull,
        CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS pk,
        utc.data_default AS dflt_value
      FROM user_tab_columns utc
      LEFT JOIN (
        SELECT ucc.column_name
        FROM user_constraints uc
        JOIN user_cons_columns ucc ON uc.constraint_name = ucc.constraint_name
        WHERE uc.constraint_type = 'P' AND uc.table_name = UPPER('${tableName}')
      ) pk ON pk.column_name = utc.column_name
      WHERE utc.table_name = UPPER('${tableName}')
      ORDER BY utc.column_id
    `;
  }
}

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += ch;
      if (ch === "*" && next === "/") {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (next === "'") { current += next; i++; } // Oracle escapes a quote inside a string as ''
        else inString = false;
      }
      continue;
    }
    if (ch === "-" && next === "-") { inLineComment = true; current += ch; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; current += ch; continue; }
    if (ch === "'") { inString = true; current += ch; continue; }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

// ponytail: minimal self-check for the statement splitter, the one piece of non-trivial
// parsing logic in this file. Run directly: `node dist/src/db/oracle-adapter.js`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.deepStrictEqual(
    splitSqlStatements("CREATE TABLE a (x INT); CREATE TABLE b (y INT);"),
    ["CREATE TABLE a (x INT)", "CREATE TABLE b (y INT)"],
    "splits two plain statements"
  );
  assert.deepStrictEqual(
    splitSqlStatements("INSERT INTO t (msg) VALUES ('it''s; still one value');"),
    ["INSERT INTO t (msg) VALUES ('it''s; still one value')"],
    "ignores a semicolon inside a quoted string, including an escaped quote"
  );
  assert.deepStrictEqual(
    splitSqlStatements("-- comment with a ; in it\nCREATE TABLE a (x INT);"),
    ["-- comment with a ; in it\nCREATE TABLE a (x INT)"],
    "ignores a semicolon inside a line comment"
  );
  assert.deepStrictEqual(
    splitSqlStatements("/* block ; comment */ CREATE TABLE a (x INT);"),
    ["/* block ; comment */ CREATE TABLE a (x INT)"],
    "ignores a semicolon inside a block comment"
  );
  assert.deepStrictEqual(splitSqlStatements("   ;  ; "), [], "drops empty statements");
  console.log("[oracle-adapter] splitSqlStatements self-check passed");
}
