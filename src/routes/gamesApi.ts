import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Games from "../db/games.js";
import SSE from "../sse.js";

const router = Router();

router.get("/", async (_request, response) => {
  const games = await Games.list();

  response.json(games);
});

router.post("/", requireAuth, async (request, response) => {
  const user = request.session.user as { id: number };
  const game = await Games.create(user.id);
  SSE.broadcast({ type: "game_updates", data: await Games.list() });

  response.json(game);
});

router.get("/:gameId/join", requireAuth, async (request, response) => {
  const { gameId } = request.params as { gameId: string };
  const userId = request.session.user?.id;
  if (userId && gameId) {
    await Games.joinGame(parseInt(gameId), userId);
    SSE.broadcast({ type: "game_updates", data: await Games.list() });
    response.redirect(`/game/${gameId}`);
  }
});

export default router;
