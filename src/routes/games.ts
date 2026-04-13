import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
// import Games from "../db/games.js";
// import SSE from "../sse.js";

const router = Router();

// router.get("/", async (_request, response) => {
//   const games = await Games.list();

//   response.json(games);
// });

// router.post("/", requireAuth, async (request, response) => {
//   const user = request.session.user as { id: number };
//   const game = await Games.create(user.id);
//   SSE.broadcast({ type: "game_updates", data: await Games.list() });

//   response.json(game);
// });

router.get("/:gameId", requireAuth, (request, response) => {
  const gameId = request.params.gameId;
  // const userId = request.session.user?.id;
  // if gameId
  // Games.ge
  response.status(200).render("game", { gameId: gameId });

  // response.json({ succss: trufe });
});

export default router;
