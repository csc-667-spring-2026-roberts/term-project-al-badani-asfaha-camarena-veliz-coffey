import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Games from "../db/games.js";
import SSE from "../sse.js";
import { EventTypes } from "../types/types.js";

const router = Router();

router.get("/", async (_request, response) => {
  const games = await Games.list();

  response.json(games);
});

router.post("/", requireAuth, async (request, response) => {
  const user = request.session.user as { id: number };
  const game = await Games.create(user.id);
  SSE.broadcast({ type: EventTypes.games_updated, data: await Games.list() });

  response.json(game);
});

router.get("/:gameId/join", requireAuth, async (request, response) => {
  const userId = request.session.user?.id;
  if (!userId) {
    response.status(401).send("Unauthorized");
    return;
  }

  const gameId = parseInt(request.params.gameId as string);

  if (userId && gameId) {
    const playerCount = await Games.playerCount(gameId);
    console.log({ playerCount });
    if (playerCount >= 4) {
      response.redirect("/lobby");
      return;
    }

    try {
      await Games.joinGame(gameId, userId);
      SSE.broadcast({ type: EventTypes.games_updated, data: await Games.list() });

      await Games.deal(gameId);
      SSE.broadcastToGame(gameId, {
        type: EventTypes.game_state_updated,
        state: await Games.state(gameId),
      });

      response.redirect(`/game/${String(gameId)}`);
    } catch (error: unknown) {
      console.error(error);
      response.redirect("/lobby");
    }
  }
});

export default router;
