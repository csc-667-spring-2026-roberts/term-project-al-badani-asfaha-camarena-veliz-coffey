import express from "express";
import path from "path";

import accountRoutes from "./routes/account.js";
import homeRoutes from "./routes/home.js";
import testRoutes from "./routes/test.js";
// import loggingMiddleware from "./middleware/logging.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(express.static(path.join(path.resolve(), "/public")));
app.use(express.static(path.join(path.resolve(), "/views")));

app.use((request, _, next) => {
  console.log(`${new Date().toISOString()} ${request.method} ${request.path}`);
  next();
});

// app.use(loggingMiddleware);

app.use("/", homeRoutes);
app.use("/", accountRoutes);
app.use("/test", testRoutes);

app.listen(PORT, () => {
  console.log("Server is running at http://localhost:" + String(PORT));
});
