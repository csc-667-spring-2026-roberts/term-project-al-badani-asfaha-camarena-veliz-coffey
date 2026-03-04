import express from "express";
import path from "path";

import homeRoutes from "./routes/home.js";
import testRoutes from "./routes/test.js";
// import loggingMiddleware from "./middleware/logging.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(path.resolve(), "../public")));

app.use((request, _, next) => {
  console.log(`${new Date().toISOString()} ${request.method} ${request.path}`);
  next();
});

// app.use(loggingMiddleware);

app.use("/", homeRoutes);
app.use("/test", testRoutes);

app.listen(PORT, () => {
  console.log("Server is running at http://localhost:" + String(PORT));
});
