import { Router } from "express";
import SSE from "../sse.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (request, response) => {
  const userId = request.session.user?.id;
  if (userId) {
    const clientId = SSE.addClient(userId, response);

    request.on("close", () => {
      console.log(`clinet closed ${clientId.toString()}`);
      SSE.removeClient(clientId);
      response.end();
    });
  }
});

export default router;
