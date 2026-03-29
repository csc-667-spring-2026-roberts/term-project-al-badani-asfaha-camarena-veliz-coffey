import express from "express";
import path from "path";

import homeRoutes from "./routes/home.js";
import testRoutes from "./routes/test.js";
import { fileURLToPath } from "url";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import db from "./db/connection.js";
import authRoutes from "./routes/auth.js";
// import loggingMiddleware from "./middleware/logging.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PgSession = connectPgSimple(session);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "/public")));

app.use(
  session({
    store: new PgSession({ pgPromise: db }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// app.use(loggingMiddleware);

app.use((request, _, next) => {
  console.log(`${new Date().toISOString()} ${request.method} ${request.path}`);
  next();
});

// app.use(loggingMiddleware);

app.use("/", homeRoutes);
app.use("/test", testRoutes);
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log("Server is running at http://localhost:" + String(PORT));
});
