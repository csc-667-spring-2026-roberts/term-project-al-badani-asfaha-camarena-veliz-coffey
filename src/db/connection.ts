import dotenv from "dotenv";
import pgPromise from "pg-promise";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined) {
  throw new Error("DATABASE_URL undefined in process environment");
}

// const db = pgp()(connectionString);

const pgp = pgPromise();
const connection = pgp({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default connection;
