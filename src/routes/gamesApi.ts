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
      response.redirect(`/game/${String(gameId)}`);
    } catch (error: unknown) {
      console.error(error);
      response.redirect("/lobby");
    }
  }
});

router.get("/:gameId/state", requireAuth, async (request, response) => {
  const gameId = parseInt(request.params.gameId as string);
  const userId = request.session.user?.id;
  if (!userId) {
    response.status(401).send("Unauthorized");
    return;
  }
  try {
    const gameState = await Games.getFullState(gameId, userId);
    response.json(gameState);
  } catch (error: unknown) {
    console.error(error);
    response.status(500).json({ error: "Failed to load game state" });
  }
});

router.post("/:gameId/start", requireAuth, async (request, response) => {
  const gameId = parseInt(request.params.gameId as string);
  const userId = request.session.user?.id;
  if (!userId) {
    response.status(401).send("Unauthorized");
    return;
  }

  const creator = await Games.isCreator(gameId, userId);
  if (!creator) {
    response.status(403).json({ error: "Only the game creator can start the game" });
    return;
  }

  try {
    await Games.startGame(gameId);
    const gameState = await Games.getFullState(gameId, userId);
    SSE.broadcastToGame(gameId, { type: EventTypes.game_state_updated, state: gameState });
    SSE.broadcast({ type: EventTypes.games_updated, data: await Games.list() });
    response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start game";
    response.status(400).json({ error: message });
  }
});

router.post("/:gameId/draw", requireAuth, async (request, response) => {
  const gameId = parseInt(request.params.gameId as string);
  const userId = request.session.user?.id;
  if (!userId) {
    response.status(401).send("Unauthorized");
    return;
  }

  try {
    const gamePlayerId = await Games.getGameUserId(gameId, userId);
    if (!gamePlayerId) {
      response.status(403).json({ error: "You are not in this game" });
      return;
    }

    const currentTurn = await Games.getCurrentTurn(gameId);
    if (!currentTurn || currentTurn.game_player_id !== gamePlayerId) {
      response.status(403).json({ error: "It is not your turn" });
      return;
    }

    const result = await Games.drawCard(gameId, gamePlayerId);
    const gameState = await Games.getFullState(gameId, userId);
    SSE.broadcastToGame(gameId, { type: EventTypes.game_state_updated, state: gameState });
    response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to draw card";
    response.status(400).json({ error: message });
  }
});

router.post("/:gameId/play", requireAuth, async (request, response) => {
  const gameId = parseInt(request.params.gameId as string);
  const userId = request.session.user?.id;
  const { card_id } = request.body as { card_id: number };

  if (!userId) {
    response.status(401).send("Unauthorized");
    return;
  }

  try {
    const gamePlayerId = await Games.getGameUserId(gameId, userId);
    if (!gamePlayerId) {
      response.status(403).json({ error: "You are not in this game" });
      return;
    }

    const currentTurn = await Games.getCurrentTurn(gameId);
    if (!currentTurn || currentTurn.game_player_id !== gamePlayerId) {
      response.status(403).json({ error: "It is not your turn" });
      return;
    }

    const result = await Games.playCard(gameId, gamePlayerId, card_id);

    if (result.success) {
      const gameState = await Games.getFullState(gameId, userId);
      SSE.broadcastToGame(gameId, { type: EventTypes.game_state_updated, state: gameState });
    }

    response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to play card";
    response.status(400).json({ error: message });
  }
});

export default router;
