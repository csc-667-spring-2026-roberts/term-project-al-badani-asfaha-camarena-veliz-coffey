# Milestone 5 - Postgres Setup
This doc includes a simple guide to perp local env for milestone 5

## Install Postgres Locally
- Download and install postgres: https://www.postgresql.org/download/
- During setup make sure to save superuser password you set

## Database Setup
- Open pgadmin (it is installed with postgres) or use `pgsql` command, create a connection to the local postgres server with superuser (username: postgres, password: [set during setup])
- Open query tool in pgadmin (use shortcut Alt + Shift + Q)
- Use this SQL script to create a database user for the server:
```
CREATE ROLE kitten WITH
	LOGIN
	NOSUPERUSER
	NOCREATEDB
	NOCREATEROLE
	INHERIT
	NOREPLICATION
	NOBYPASSRLS
	CONNECTION LIMIT -1
	PASSWORD '[set a random password]';
```
- Create a new database:
```
CREATE DATABASE term_project_dev
    WITH
    OWNER = kitten
    ENCODING = 'UTF8'
    LOCALE_PROVIDER = 'libc'
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;
```
- Change database to term_project_dev and run this SQL script to create test_table:
```
CREATE TABLE IF NOT EXISTS test_table (
  id TEXT PRIMARY KEY,
  message TEXT
);

ALTER TABLE test_table OWNER TO kitten;
```

## Express Server
- Run npm install to get new deps
- Copy .env.example to a new file with name `.env`
- Set database connection [password] and [username]
- Use npm run dev to start server

## Check Demo
- Open browswer and access server url at path /testdb.html, http://localhost:3000/testdb.html
- Upsert record using form and check new records showing below form  