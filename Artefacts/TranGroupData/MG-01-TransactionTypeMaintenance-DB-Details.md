# MG-01: Transaction type maintenance — list, add, update, delete

## a. Tables & CRUD Footprint

| Program | Transaction | DB2 Tables Accessed (CRUD) | VSAM Files Accessed (CRUD) | CICS TS (TSQ/TDQ) Used (CRUD) |
|---|---|---|---|---|
| COTRTLIC | CTLI | CARDDEMO.TRANSACTION_TYPE (R, U, D) | None | None |
| COTRTUPC | CTTU | CARDDEMO.TRANSACTION_TYPE (R, C, U, D) | None | None |

## b. Target Schema Definition
Dialect: postgresql
Mapping rule: PostgreSQL qualifier mapping: DB2 `<database>.<table>` qualifier is dropped; the table is created unqualified in the target Postgres database's default `public` schema.

```sql
-- Source: input/ctl/DB2CREAT.ctl, input/ddl/TRNTYPE.ddl, input/dcl/DCLTRTYP.dcl
CREATE TABLE TRANSACTION_TYPE
(
    TR_TYPE CHAR(2) NOT NULL,
    TR_DESCRIPTION VARCHAR(50) NOT NULL,
    PRIMARY KEY(TR_TYPE)
);

CREATE UNIQUE INDEX XTRAN_TYPE
    ON TRANSACTION_TYPE (TR_TYPE ASC);
```

## c. Seed Data
```sql
-- Source: input/ctl/DB2LTTYP.ctl
INSERT INTO TRANSACTION_TYPE (TR_TYPE, TR_DESCRIPTION) VALUES
('01', 'PURCHASE'),
('02', 'PAYMENT'),
('03', 'CREDIT'),
('04', 'AUTHORIZATION'),
('05', 'REFUND'),
('06', 'REVERAL'),
('07', 'ADJUSTMENT');
```

## Gaps
1. **Tables with no source definition:** None
2. **CREATE DATABASE statement:**
   `CREATE DATABASE CARDDEMO` was found in `input/ctl/DB2CREAT.ctl`. (Not executed).
3. **Table-level Privileges:**
   - `GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE CARDDEMO.TRANSACTION_TYPE TO PUBLIC;` found in `input/ctl/DB2CREAT.ctl`. Note: No equivalent `GRANT` was executed in the target database. DBA/admin should review and apply role-based grants.
4. **Dialect-specific precision loss:** None
