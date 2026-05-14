import { Router } from "express";
import SSE from "../sse.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (request, response) => {
  const userId = request.session.user?.id;
  const gameIdParam = request.query["gameId"];
  const gameId =
    typeof gameIdParam === "string" && gameIdParam.length > 0 ? parseInt(gameIdParam) : undefined;

  if (userId) {
    const clientId = SSE.addClient(userId, response, gameId);

    request.on("close", () => {
      console.log(`client closed ${clientId.toString()}`);
      SSE.removeClient(clientId);
      response.end();
    });
  }
});

router.get("/:gameId", requireAuth, (request, response) => {
  const userId = request.session.user?.id;
  const gameId = parseInt(request.params.gameId as string);
  if (userId && gameId) {
    const clientId = SSE.addClient(userId, response, gameId);

    request.on("close", () => {
      console.log(`clinet closed ${clientId.toString()}`);
      SSE.removeClient(clientId);
      response.end();
    });
  }
});

export default router;
