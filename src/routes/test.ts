import { Router } from "express";
import db from "../db/connection.js";

const router = Router();

// router.get("/:id", async (request, response) => {
//   const { id } = request.params;
//   //   await db.none(`INSERT INTO test_table (id, message)
//   // VALUES ($1, $2)
//   // ON CONFLICT (id)
//   // DO UPDATE SET message = EXCLUDED.message;
//   // `, [id, `Requested id: ${id} at ${new Date().toLocaleTimeString()}`])
//   // await db.none("INSERT INTO test_table (message) VALUES ($1)", [
//   //   `Requested id: ${id} at ${new Date().toLocaleTimeString()}`,
//   // ]);

//   response.json(await db.any("SELECT * FROM test_table"));
// });

router.get("/getData", async (_, response) => {
  response.json(await db.any("SELECT * FROM test_table"));
});

router.post("/", async (request, response) => {
  const { id, message } = request.body as { id: number; message: string };
  await db.none(
    `INSERT INTO test_table (id, message)
VALUES ($1, $2)
ON CONFLICT (id) 
DO UPDATE SET message = EXCLUDED.message;
`,
    [id, message],
  );
  response.redirect("testdb.html");
});

export default router;
