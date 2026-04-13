import { Response } from "express";

interface UserClient {
  response: Response;
  userId: number;
  gameId?: number;
}

let nextClientId = 0;
const clients: Map<number, UserClient> = new Map();

function addClient(userId: number, response: Response, gameId?: number): number {
  nextClientId++;
  console.log(`Add client ${nextClientId.toString()} for user ${userId.toString()}`);
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  response.write("ok:\n\n");
  clients.set(nextClientId, { userId: userId, response: response, gameId: gameId });
  return nextClientId;
}

function removeClient(clientId: number): void {
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

function broadcastToGame(data: object, gameId: number): void {
  for (const client of clients.values()) {
    if (client.gameId === gameId) {
      sendData(client, data);
    }
  }
}

export default { addClient, removeClient, sendData, broadcast, broadcastToGame };
