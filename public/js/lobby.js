"use strict";
(() => {
  // src/client/lobby.ts
  var dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true
  });
  var gameTemplate = document.getElementById("game-template");
  var buttonElement = document.getElementById("create-game");
  var gameContainer = document.querySelector("#game-table tbody");
  function addGame(gameItem, insertFirst = false) {
    if (!gameContainer) {
      return;
    }
    const gameClone = gameTemplate.content.cloneNode(true);
    const titleElement = gameClone.querySelector(".title");
    if (titleElement) titleElement.textContent = gameItem.id.toString();
    const statusElement = gameClone.querySelector(".game-status");
    if (statusElement) statusElement.textContent = gameItem.status.toString();
    const countElement = gameClone.querySelector(".player-count");
    if (countElement) countElement.textContent = gameItem.player_count.toString();
    const emailElement = gameClone.querySelector(".creator-email");
    if (emailElement) emailElement.textContent = gameItem.creator_email;
    const dateElement = gameClone.querySelector(".created-at");
    if (dateElement)
      dateElement.textContent = dateTimeFormatter.format(new Date(gameItem.created_at));
    if (!insertFirst) {
      gameContainer.appendChild(gameClone);
    } else {
      gameContainer.prepend(gameClone);
    }
    return;
  }
  async function fetchGames() {
    const response = await fetch("/game");
    const gameList = await response.json();
    if (gameList.length === 0) {
      return;
    }
    for (const gameItem of gameList) {
      addGame(gameItem);
    }
  }
  async function createGame() {
    const response = await fetch("/game", { method: "post" });
    const gameItem = await response.json();
    addGame(gameItem, true);
  }
  fetchGames().catch((e) => {
    console.log(e);
  });
  if (buttonElement) {
    buttonElement.addEventListener("click", () => {
      void createGame();
    });
  }
  console.log("Lobby client loaded");
})();
//# sourceMappingURL=lobby.js.map
