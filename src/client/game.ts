import { Card, DetailedGameState } from "../types/types.js";

const gameDataEl = document.getElementById("game-data");
const gameId = parseInt(gameDataEl?.dataset["gameId"] ?? "0");
const currentUserId = parseInt(gameDataEl?.dataset["userId"] ?? "0");

let gameState: DetailedGameState | null = null;

/** SSE */

const source = new EventSource(`/api/sse?gameId=${gameId.toString()}`);

source.onopen = (): void => {
  void fetchState();
};

source.onmessage = (event: MessageEvent): void => {
  interface Payload {
    type: string;
  }
  const data = JSON.parse(event.data as string) as Payload;
  if (data.type === "game_state_updated") {
    void fetchState();
  }
};

source.onerror = (err: Event): void => {
  console.error("SSE error:", err);
};

/** Actions */

async function fetchState(): Promise<void> {
  try {
    const res = await fetch(`/api/games/${gameId.toString()}/state`);
    if (!res.ok) return;
    gameState = (await res.json()) as DetailedGameState;
    render(gameState);
  } catch (e) {
    console.error("fetchState failed:", e);
  }
}

async function startGame(): Promise<void> {
  try {
    const res = await fetch(`/api/games/${gameId.toString()}/start`, { method: "POST" });
    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      showMessage(`⚠️ ${err.error}`);
    }
  } catch (e) {
    console.error(e);
  }
}

function cardStyle(cardType: string | null | undefined): string {
  if (!cardType) return "linear-gradient(160deg,#374151,#1f2937)";

  const styles: Record<string, string> = {
    exploding_kitten: "linear-gradient(160deg,#f97316,#dc2626)",
    defuse: "linear-gradient(160deg,#22c55e,#15803d)",
    skip: "linear-gradient(160deg,#3b82f6,#1d4ed8)",
    attack: "linear-gradient(160deg,#ef4444,#7f1d1d)",
    shuffle: "linear-gradient(160deg,#a855f7,#6b21a8)",
    see_the_future: "linear-gradient(160deg,#6366f1,#3730a3)",
    nope: "linear-gradient(160deg,#f43f5e,#9f1239)",
    favor: "linear-gradient(160deg,#fbbf24,#b45309)",
    taco_cat: "linear-gradient(160deg,#14b8a6,#0f766e)",
    hairy_potato_cat: "linear-gradient(160deg,#a3a3a3,#525252)",
    cattermelon: "linear-gradient(160deg,#4ade80,#166534)",
    rainbow_cat: "linear-gradient(160deg,#f472b6,#7c3aed)",
    beard_cat: "linear-gradient(160deg,#fb923c,#92400e)",
  };

  return styles[cardType] ?? "linear-gradient(160deg,#374151,#1f2937)";
}

async function drawCard(): Promise<void> {
  try {
    const res = await fetch(`/api/games/${gameId.toString()}/draw`, { method: "POST" });
    interface DrawRes {
      exploded?: boolean;
      defused?: boolean;
      card?: Card;
      error?: string;
    }
    const result = (await res.json()) as DrawRes;
    if (result.error) {
      showMessage(`⚠️ ${result.error}`);
      return;
    }
    if (result.exploded) {
      showMessage("You drew an Exploding Kitten and had no Defuse — eliminated!");
    } else if (result.defused) {
      showMessage("Exploding Kitten defused! You placed it back in the deck.");
    } else if (result.card) {
      showMessage(`Drew: ${cardEmoji(result.card.card_type)} ${fmt(result.card.card_type)}`);
    }
  } catch (e) {
    console.error(e);
  }
}

async function playCard(cardId: number): Promise<void> {
  try {
    const res = await fetch(`/api/games/${gameId.toString()}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId }),
    });
    interface PlayRes {
      success?: boolean;
      message?: string;
      peek?: Card[];
      error?: string;
    }
    const result = (await res.json()) as PlayRes;
    const msg = result.message ?? result.error ?? "Unknown response";
    showMessage(result.success === false ? `⚠️ ${msg}` : msg);
    if (result.peek && result.peek.length > 0) showPeekModal(result.peek);
  } catch (e) {
    console.error(e);
  }
}

/** UI Helpers */

function fmt(cardType: string | null | undefined): string {
  if (!cardType) return "Unknown";
  return cardType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cardEmoji(cardType: string | null | undefined): string {
  if (!cardType) return "🃏";

  const map: Record<string, string> = {
    exploding_kitten: "💣",
    defuse: "🔧",
    skip: "⏭️",
    attack: "⚔️",
    favor: "🙏",
    shuffle: "🔀",
    see_the_future: "🔮",
    nope: "🙅",
    taco_cat: "🌮",
    hairy_potato_cat: "🥔",
    cattermelon: "🍉",
    rainbow_cat: "🌈",
    beard_cat: "🧔",
  };

  return map[cardType] ?? "🃏";
}

function showMessage(msg: string): void {
  const el = document.getElementById("action-message");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");
  setTimeout(() => {
    el.classList.remove("visible");
  }, 4000);
}

function showPeekModal(cards: Card[]): void {
  const modal = document.getElementById("peek-modal");
  const content = document.getElementById("peek-cards");
  if (!modal || !content) return;
  content.innerHTML = cards
    .map(
      (c) => `<div class="peek-card" style="background:${cardStyle(c.card_type)};">
      <div class="card-corner">${fmt(c.card_type)}</div>
      <div class="card-center"><span class="peek-emoji">${cardEmoji(c.card_type)}</span></div>
      <div class="card-corner bottom">${fmt(c.card_type)}</div>
    </div>`,
    )
    .join("");
  modal.classList.add("visible");
}

// ── Render ──────────────────────────────────────────────────

function render(s: DetailedGameState): void {
  renderAreas(s);
  renderStatus(s);
  renderPlayers(s);
  renderDeck(s);
  renderHand(s);
  renderControls(s);
}

function renderAreas(s: DetailedGameState): void {
  const table = document.getElementById("table-area");
  const waiting = document.getElementById("waiting-area");
  const ended = document.getElementById("ended-area");
  const hand = document.getElementById("hand-area");
  const countMsg = document.getElementById("player-count-msg");
  const winnerMsg = document.getElementById("winner-msg");

  if (table) table.style.display = s.status === "started" ? "flex" : "none";
  if (waiting) waiting.style.display = s.status === "waiting" ? "flex" : "none";
  if (ended) ended.style.display = s.status === "ended" ? "flex" : "none";
  if (hand) hand.style.display = s.my_game_player_id !== null ? "block" : "none";

  if (countMsg && s.status === "waiting") {
    countMsg.textContent = `${s.players.length.toString()} player(s) joined — need at least 2 to start`;
  }
  if (winnerMsg && s.status === "ended") {
    winnerMsg.textContent = s.winner_email ? `🎉 ${s.winner_email} wins!` : "No winner.";
  }
}

function renderStatus(s: DetailedGameState): void {
  const el = document.getElementById("game-status-msg");
  if (!el) return;
  if (s.status === "ended") {
    el.textContent = s.winner_email ? `🏆 Game over! ${s.winner_email} wins!` : "Game over!";
  } else if (s.status === "waiting") {
    el.textContent = `Waiting for players… ${s.players.length.toString()} joined`;
  } else {
    const cur = s.players.find((p) => p.id === s.current_game_player_id);
    const isMyTurn = s.my_game_player_id === s.current_game_player_id;
    el.textContent = isMyTurn
      ? "⭐ Your turn! Play a card or click Draw to end your turn."
      : `${cur?.email ?? "?"}'s turn…`;
  }
}

function renderPlayers(s: DetailedGameState): void {
  const container = document.getElementById("players-container");
  if (!container) return;
  container.innerHTML = s.players
    .map((p) => {
      const isMe = p.user_id === currentUserId;
      const isCurrent = p.id === s.current_game_player_id;
      const classes = [
        "player-card",
        p.is_alive ? "" : "dead",
        isCurrent ? "current-turn" : "",
        isMe ? "me" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const label = isMe ? "You" : (p.email.split("@")[0] ?? p.email);
      return `<div class="${classes}">
        <img src="${p.gravatar_url}" alt="avatar" class="player-avatar">
        <div class="player-info">
          <span class="player-email" title="${p.email}">${label}</span>
          <span class="player-cards">${p.is_alive ? `🃏 ${p.card_count.toString()} cards` : "💀 Eliminated"}</span>
          ${isCurrent && p.is_alive ? '<span class="turn-indicator">▶ Turn</span>' : ""}
        </div>
      </div>`;
    })
    .join("");
}

function renderDeck(s: DetailedGameState): void {
  const deckCount = document.getElementById("deck-count");
  const deckCard = document.getElementById("deck-card");
  const discEmoji = document.getElementById("discard-emoji");
  const discLabel = document.getElementById("discard-top");

  if (deckCount) deckCount.textContent = `${s.deck_size.toString()} cards`;

  const isMyTurn = s.my_game_player_id === s.current_game_player_id && s.status === "started";
  if (deckCard) {
    if (isMyTurn) {
      deckCard.classList.remove("disabled");
      deckCard.onclick = (): void => {
        void drawCard();
      };
    } else {
      deckCard.classList.add("disabled");
      deckCard.onclick = null;
    }
  }
  if (discEmoji && discLabel) {
    discEmoji.textContent = s.discard_top ? cardEmoji(s.discard_top.card_type) : "♻️";
    discLabel.textContent = s.discard_top ? fmt(s.discard_top.card_type) : "Empty";
  }
}

function renderHand(s: DetailedGameState): void {
  const container = document.getElementById("hand-container");
  if (!container) return;
  if (s.my_hand.length === 0) {
    container.innerHTML = '<p class="empty-hand">No cards in hand</p>';
    return;
  }
  const isMyTurn = s.my_game_player_id === s.current_game_player_id && s.status === "started";
  container.innerHTML = s.my_hand
    .map((c) => {
      const playable = isMyTurn && !["defuse", "exploding_kitten"].includes(c.card_type);
      const name = fmt(c.card_type);
      return `<div class="hand-card ${playable ? "playable" : ""}" data-card-id="${c.id.toString()}"
          title="${c.description}" style="background:${cardStyle(c.card_type)};">
        <div class="card-corner">${name}</div>
        <div class="card-center"><span class="card-emoji">${cardEmoji(c.card_type)}</span></div>
        <div class="card-corner bottom">${name}</div>
      </div>`;
    })
    .join("");
  if (isMyTurn) {
    container.querySelectorAll<HTMLElement>(".hand-card.playable").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset["cardId"];
        if (id) void playCard(parseInt(id));
      });
    });
  }
}

function renderControls(s: DetailedGameState): void {
  const drawBtn = document.getElementById("draw-btn") as HTMLButtonElement | null;
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const isMyTurn = s.my_game_player_id === s.current_game_player_id;

  if (drawBtn) {
    drawBtn.style.display = s.status === "started" && isMyTurn ? "inline-flex" : "none";
    drawBtn.onclick = (): void => {
      void drawCard();
    };
  }
  if (startBtn) {
    startBtn.style.display = s.status === "waiting" && s.is_creator ? "inline-flex" : "none";
    startBtn.onclick = (): void => {
      void startGame();
    };
  }
}

// ── Init ────────────────────────────────────────────────────
document.getElementById("close-peek")?.addEventListener("click", () => {
  document.getElementById("peek-modal")?.classList.remove("visible");
});
