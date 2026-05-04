import { Router } from "express";

const router = Router();

router.get("/", (_, response) => {
  response.redirect("/login");
});

// router.get("/:id", (request, response) => {
//   response.send(`Hi at ${request.params.id}`);
// });

export default router;
