import { Router } from "express";

const router = Router();

router.get("/", (_, response) => {
  response.send(`<h1>Hello World! check hot reload</h1><p>${new Date().toLocaleDateString()}</p>`);
});

// router.get("/:id", (request, response) => {
//   response.send(`Hi at ${request.params.id}`);
// });

export default router;
