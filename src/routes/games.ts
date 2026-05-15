import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
// import Games from "../db/games.js";
// import SSE from "../sse.js";

const router = Router();

router.get("/:gameId", requireAuth, (request, response) => {
  const gameId = request.params.gameId;
  const userId = request.session.user?.id;

  // response.status(200).render("game", { gameId: gameId, user: userId });

  if (!userId) {
    response.redirect("/login");
    return;
  }

  response.status(200).render("game", { gameId, userId });
});

export default router;
