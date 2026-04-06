import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Games from "../db/games.js";

const router = Router();

router.get("/", async (_request, response) => {
  const games = await Games.list();

  response.json({ games });
});

router.post("/", requireAuth, async (request, response) => {
  const user = request.session.user as { id: number };
  const game = await Games.create(user.id);

  response.json({ game });
});

export default router;
