import { GameListItem } from "../types/types.js";
const source: EventSource = new EventSource("/api/sse");
// const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
//   year: "numeric",
//   month: "2-digit",
//   day: "2-digit",
//   hour: "numeric",
//   minute: "numeric",
//   second: "numeric",
//   hour12: true,
// });

const gameTemplate = document.getElementById("game-template") as HTMLTemplateElement;
const buttonElement = document.getElementById("create-game");
const gameContainer = document.getElementById("game-container");

// async function joinGame(gameId: number): Promise<void> {
//   const response = await fetch(`/api/games/${gameId}/join`, { method: "post" });
//   if (!response.ok) {
//     console.error(await response.text());
//   }
// }

function renderGame(gameItem: GameListItem): Node {
  // if (!gameContainer) {
  //   return;
  // }
  const gameClone = gameTemplate.content.cloneNode(true) as HTMLElement;
  const titleElement = gameClone.querySelector(".title");
  if (titleElement) titleElement.textContent = `Game #${gameItem.id.toString()}`;

  const statusElement = gameClone.querySelector(".game-status");
  if (statusElement) statusElement.textContent = gameItem.status.toString();

  const countElement = gameClone.querySelector(".player-count");
  if (countElement) countElement.textContent = "count: " + gameItem.player_count.toString();

  const emailElement = gameClone.querySelector(".creator-email");
  if (emailElement) emailElement.textContent = gameItem.creator_email;

  const joinElement = gameClone.querySelector("[data-join-button]");
  if (joinElement) joinElement.setAttribute("href", `/api/games/${gameItem.id.toString()}/join`);
  // if (joinElement) joinElement.addEventListener("click", () => void joinGame(gameItem.id));

  // const dateElement = gameClone.querySelector(".created-at");
  // if (dateElement)
  //   dateElement.textContent = dateTimeFormatter.format(new Date(gameItem.created_at));

  // if (!insertFirst) {
  //   gameContainer.appendChild(gameClone);
  // } else {
  //   gameContainer.prepend(gameClone);
  // }
  return gameClone as Node;
}
function displayGames(games: GameListItem[]): void {
  if (!gameContainer) {
    return;
  }
  gameContainer.replaceChildren(...games.map(renderGame));
  // for (const gameItem of games) {
  //   addGame(gameItem);
  // }
}
async function fetchGames(): Promise<void> {
  const response = await fetch("/api/games");
  const gameList: GameListItem[] = await response.json();

  if (gameList.length === 0) {
    return;
  }
  displayGames(gameList);
}

async function createGame(): Promise<void> {
  const response = await fetch("/api/games", { method: "post" });
  await response.json();
  // addGame(gameItem, true);
}

// fetchGames().catch((e: unknown) => {
//   console.log(e);
// });

if (buttonElement) {
  buttonElement.addEventListener("click", () => {
    void createGame();
  });
}
console.log("Lobby client loaded");
source.onopen = (): void => {
  void fetchGames();
};

source.onmessage = (event): void => {
  const data = JSON.parse(event.data);
  if (data.type === "game_updates") {
    displayGames(data.data);
  }
  console.log(event.data);
};

source.onerror = (error): void => {
  console.error("SSE failed:", error);
};
