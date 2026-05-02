import { Response } from "express";

interface UserClient {
  response: Response;
  userId: number;
  gameId?: number;
  keepalive: NodeJS.Timeout;
}

let nextClientId = 0;
const clients: Map<number, UserClient> = new Map();

function addClient(userId: number, response: Response, gameId?: number): number {
  const id = nextClientId++;

  console.log(`Add client ${id.toString()} for user ${userId.toString()}`);

  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });

  response.write("ok:\n\n");

  const keepalive = setInterval(() => {
    try {
      response.write(":ping\n\n");
    } catch {
      clearInterval(keepalive);
    }
  }, 25_000);

  clients.set(id, { response: response, userId: userId, gameId: gameId, keepalive: keepalive });
  return id;
}

function removeClient(clientId: number): void {
  const client = clients.get(clientId);

  if (client) {
    clearInterval(client.keepalive);
  }

  clients.delete(clientId);
}

function sendData(client: UserClient, data: object): void {
  const data_str = JSON.stringify(data);
  client.response.write(`data: ${data_str}\n\n`);
}

function broadcast(data: object): void {
  for (const client of clients.values()) {
    sendData(client, data);
  }
}

function broadcastToGame(gameId: number, data: object): void {
  for (const client of clients.values()) {
    if (client.gameId === gameId) {
      sendData(client, data);
    }
  }
}

export default { addClient, removeClient, sendData, broadcast, broadcastToGame };
