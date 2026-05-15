import db from "./connection.js";
import {
  Game,
  GameListItem,
  GameUserState,
  User,
  Card,
  DetailedGameState,
  DrawResult,
  PlayResult,
  PlayerState,
} from "../types/types.js";

const create = async (user_id: number): Promise<GameListItem> => {
  const game = await db.one<Game>("INSERT INTO games DEFAULT VALUES RETURNING *");

  await db.none("INSERT INTO game_users (game_id, user_id, seat) VALUES ($1, $2, 0)", [
    game.id,
    user_id,
  ]);

  await db.none(
    `INSERT INTO game_cards (game_id, card_id, location, position)
    SELECT $1, cards.id, 'deck', ROW_NUMBER() OVER (ORDER BY random())
    FROM cards`,
    [game.id],
  );

  const user = await db.one<User>("SELECT * FROM users WHERE id = ($1)", [user_id]);
  return {
    id: game.id,
    status: game.status,
    created_at: game.created_at,
    player_count: 1,
    creator_email: user.email,
  };
};

const list = async (): Promise<GameListItem[]> => {
  return db.any<GameListItem>(
    `SELECT 
            g.id, 
            g.status, 
            g.created_at, 
            u.email AS creator_email,
            (SELECT COUNT(*)::int FROM game_users WHERE game_id = g.id) AS player_count
        FROM games g
        JOIN game_users gu ON g.id = gu.game_id
        JOIN users u ON gu.user_id = u.id
        WHERE gu.joined_at = (
            SELECT MIN(joined_at)
            FROM game_users
            WHERE game_id = g.id
        )
        ORDER BY g.created_at DESC`,
  );
};

const joinGame = async (gameId: number, userId: number): Promise<void> => {
  await db.none(
    "INSERT INTO game_users (game_id, user_id, seat) VALUES ($1, $2, 1) ON CONFLICT (game_id, user_id) DO NOTHING",
    [gameId, userId],
  );
};

const playerCount = async (gameId: number): Promise<number> => {
  const result = await db.one<{ count: string }>(
    "SELECT COUNT(*)::int FROM game_users WHERE game_id=$1",
    [gameId],
  );

  return parseInt(result.count);
};

const DEAL_SQL = `
  UPDATE game_cards
  SET game_player_id=$1,
      location='hand'
  WHERE game_id=$2
  AND card_id IN (
    SELECT card_id FROM game_cards
    WHERE game_id=$2 AND location='deck'
    ORDER BY random()
    LIMIT 7
)`;

const deal = async (gameId: number): Promise<void> => {
  const players = await db.any<{ id: number }>("SELECT id FROM game_users WHERE game_id=$1", [
    gameId,
  ]);

  for (const player of players) {
    await db.none(DEAL_SQL, [player.id, gameId]);
  }
};
const state = async (gameId: number): Promise<GameUserState[]> =>
  await db.many<GameUserState>(
    `SELECT users.email, users.gravatar_url, (
      SELECT COUNT(*) FROM game_cards
      WHERE game_cards.game_player_id = game_users.id
    ) AS card_count
    FROM users
    JOIN game_users ON game_users.user_id = users.id
    WHERE game_users.game_id = $1
    ORDER BY game_users.seat ASC`,
    [gameId],
  );

/** HELPERS */

const dealToPlayer = async (gameId: number, playerId: number): Promise<void> => {
  await db.none(
    `UPDATE game_cards SET location = 'hand', game_player_id = $1, position = NULL
      WHERE game_id = $2 AND card_id IN (
        SELECT gc.card_id FROM game_cards gc
        JOIN cards c ON gc.card_id = c.id
        WHERE gc.game_id = $2 AND gc.location = 'deck'
          AND c.card_type NOT IN ('exploding_kitten', 'defuse')
        ORDER BY gc.position LIMIT 7)`,
    [playerId, gameId],
  );
  await db.none(
    `UPDATE game_cards SET location = 'hand', game_player_id = $1, position = NULL
      WHERE game_id = $2 AND card_id IN (
        SELECT gc.card_id FROM game_cards gc
        JOIN cards c ON gc.card_id = c.id
        WHERE gc.game_id = $2 AND gc.location = 'deck'
          AND c.card_type = 'defuse'
        ORDER BY gc.position LIMIT 1)`,
    [playerId, gameId],
  );
};

const placeKittenBackInDeck = async (gameId: number, ekCardId: number): Promise<void> => {
  const row = await db.one<{ count: string }>(
    "SELECT COUNT(*) AS count FROM game_cards WHERE game_id = $1 AND location = 'deck'",
    [gameId],
  );
  const pos = Math.floor(Math.random() * (parseInt(row.count) + 1)) + 1;
  await db.none(
    "UPDATE game_cards SET position = position + 1 WHERE game_id = $1 AND location = 'deck' AND position >= $2",
    [gameId, pos],
  );
  await db.none(
    "UPDATE game_cards SET location = 'deck', game_player_id = NULL, position = $1 WHERE game_id = $2 AND card_id = $3",
    [pos, gameId, ekCardId],
  );
};

const handleDefuseKitten = async (
  gameId: number,
  gamePlayerId: number,
  ekCard: Card,
  defuseCardId: number,
  turnId: number | null,
): Promise<DrawResult> => {
  await db.none(
    "UPDATE game_cards SET location = 'discard', game_player_id = NULL, position = NULL WHERE game_id = $1 AND card_id = $2",
    [gameId, defuseCardId],
  );
  await placeKittenBackInDeck(gameId, ekCard.id);
  if (turnId) {
    await db.none(
      "INSERT INTO turn_actions (turn_id, card_id, action_type) VALUES ($1, $2, 'defuse')",
      [turnId, defuseCardId],
    );
  }
  await endCurrentTurn(gameId, gamePlayerId);
  return { card: ekCard, exploded: false, defused: true, turn_ended: true };
};

const handleExplodeKitten = async (
  gameId: number,
  gamePlayerId: number,
  ekCard: Card,
): Promise<DrawResult> => {
  await db.none(
    "UPDATE game_cards SET location = 'discard', game_player_id = NULL, position = NULL WHERE game_player_id = $1",
    [gamePlayerId],
  );
  await db.none(
    "UPDATE game_cards SET location = 'discard', game_player_id = NULL, position = NULL WHERE game_id = $1 AND card_id = $2",
    [gameId, ekCard.id],
  );
  await db.none("UPDATE game_users SET is_alive = false WHERE id = $1", [gamePlayerId]);
  await checkAndSetWinner(gameId);
  await endCurrentTurn(gameId, gamePlayerId);
  return { card: ekCard, exploded: true, defused: false, turn_ended: true };
};

const fetchMyHand = async (gameId: number, myGamePlayerId: number): Promise<Card[]> =>
  db.any<Card>(
    `SELECT c.id, c.card_type, c.description
      FROM game_cards gc JOIN cards c ON gc.card_id = c.id
      WHERE gc.game_id = $1 AND gc.game_player_id = $2 AND gc.location = 'hand'
      ORDER BY c.card_type`,
    [gameId, myGamePlayerId],
  );

const fetchWinnerEmail = async (winnerId: number): Promise<string | null> => {
  const row = await db.oneOrNone<{ email: string }>(
    "SELECT u.email FROM users u JOIN game_users gu ON gu.user_id = u.id WHERE gu.id = $1",
    [winnerId],
  );
  return row?.email ?? null;
};

const getCurrentTurn = async (
  gameId: number,
): Promise<{ turn_id: number; game_player_id: number; turn_number: number } | null> => {
  return await db.oneOrNone<{ turn_id: number; game_player_id: number; turn_number: number }>(
    `SELECT t.id AS turn_id, t.game_player_id, t.turn_number
       FROM turns t
       JOIN game_users gu ON t.game_player_id = gu.id
       WHERE gu.game_id = $1
       ORDER BY t.turn_number DESC
       LIMIT 1`,
    [gameId],
  );
};

const nextAlivePlayer = async (
  gameId: number,
  currentTurnOrder: number,
): Promise<number | null> => {
  const alive = await db.any<{ id: number; turn_order: number }>(
    `SELECT id, turn_order from game_users
      WHERE game_id = $1 AND is_alive = true
      ORDER BY turn_order ASC`,
    [gameId],
  );

  const firstAlive = alive[0];
  if (firstAlive === undefined) {
    return null;
  }

  const next = alive.find((p) => p.turn_order > currentTurnOrder) ?? firstAlive;
  return next.id;
};

const checkAndSetWinner = async (gameId: number): Promise<void> => {
  const alivePlayers = await db.any<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM game_users WHERE game_id = $1 AND is_alive = true`,
    [gameId],
  );

  if (alivePlayers.length !== 1) {
    return;
  }

  const winner = alivePlayers[0];
  if (!winner) {
    return;
  }

  await db.none(
    "UPDATE games SET status = 'ended', ended_at = CURRENT_TIMESTAMP, winner_id = $1 WHERE id = $2",
    [winner.id, gameId],
  );
};

const endCurrentTurn = async (gameId: number, currentGamePlayerId: number): Promise<void> => {
  const currentTurn = await getCurrentTurn(gameId);
  if (!currentTurn) {
    return;
  }

  const game = await db.one<{ status: string }>(
    "SELECT status::text AS status FROM games WHERE id = $1",
    [gameId],
  );
  if (game.status === "ended") {
    return;
  }

  const currentPlayer = await db.one<{ turn_order: number | null }>(
    "SELECT turn_order FROM game_users WHERE id = $1",
    [currentGamePlayerId],
  );

  const nextPlayerId = await nextAlivePlayer(gameId, currentPlayer.turn_order ?? 0);
  if (!nextPlayerId) {
    return;
  }

  await db.none("INSERT INTO turns (game_player_id, turn_number) VALUES ($1, $2)", [
    nextPlayerId,
    currentTurn.turn_number + 1,
  ]);
};

/** GAMEPLAY  FUNCTIONS */

const getGameUserId = async (gameId: number, userId: number): Promise<number | null> => {
  const result = await db.oneOrNone<{ id: number }>(
    "SELECT id FROM game_users WHERE game_id = $1 AND user_id = $2",
    [gameId, userId],
  );
  return result?.id ?? null;
};

const isCreator = async (gameId: number, userId: number): Promise<boolean> => {
  const row = await db.oneOrNone<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM game_users WHERE game_id = $1 AND user_id = $2 AND seat = 0",
    [gameId, userId],
  );
  return parseInt(row?.count ?? "0") > 0;
};

const startGame = async (gameId: number): Promise<void> => {
  const players = await db.any<{ id: number }>(
    "SELECT id FROM game_users WHERE game_id = $1 ORDER BY random()",
    [gameId],
  );
  if (players.length < 2) throw new Error("Need at least 2 players to start");

  for (const [i, player] of players.entries()) {
    await db.none("UPDATE game_users SET turn_order = $1, is_alive = true WHERE id = $2", [
      i + 1,
      player.id,
    ]);
  }

  await db.none(
    `UPDATE game_cards SET location = 'deck', game_player_id = NULL, position = sub.pos
     FROM (SELECT card_id, ROW_NUMBER() OVER (ORDER BY random()) AS pos
           FROM game_cards WHERE game_id = $1) sub
     WHERE game_cards.card_id = sub.card_id AND game_cards.game_id = $1`,
    [gameId],
  );

  await db.none(
    `UPDATE game_cards SET location = 'discard', position = NULL
     WHERE game_id = $1 AND card_id IN (
       SELECT gc.card_id FROM game_cards gc JOIN cards c ON gc.card_id = c.id
       WHERE gc.game_id = $1 AND c.card_type = 'exploding_kitten'
       ORDER BY gc.position DESC OFFSET $2)`,
    [gameId, players.length - 1],
  );

  for (const player of players) {
    await dealToPlayer(gameId, player.id);
  }

  await db.none(
    `UPDATE game_cards SET position = sub.pos
     FROM (SELECT card_id, ROW_NUMBER() OVER (ORDER BY position) AS pos
           FROM game_cards WHERE game_id = $1 AND location = 'deck') sub
     WHERE game_cards.card_id = sub.card_id AND game_cards.game_id = $1`,
    [gameId],
  );

  const firstPlayer = players[0];
  if (!firstPlayer) throw new Error("No players found");
  await db.none("INSERT INTO turns (game_player_id, turn_number) VALUES ($1, 1)", [firstPlayer.id]);
  await db.none(
    "UPDATE games SET status = 'started', started_at = CURRENT_TIMESTAMP WHERE id = $1",
    [gameId],
  );
};

const getFullState = async (gameId: number, userId: number): Promise<DetailedGameState> => {
  const game = await db.one<{ id: number; status: string; winner_id: number | null }>(
    "SELECT id, status::text AS status, winner_id FROM games WHERE id = $1",
    [gameId],
  );

  const myGameUser = await db.oneOrNone<{ id: number }>(
    "SELECT id FROM game_users WHERE game_id = $1 AND user_id = $2",
    [gameId, userId],
  );
  const myGamePlayerId = myGameUser?.id ?? null;

  const players = await db.any<PlayerState>(
    `SELECT gu.id, gu.user_id, u.email, u.gravatar_url, gu.is_alive, gu.turn_order,
       (SELECT COUNT(*)::int FROM game_cards WHERE game_player_id = gu.id AND location = 'hand') AS card_count
     FROM game_users gu JOIN users u ON gu.user_id = u.id
     WHERE gu.game_id = $1
     ORDER BY gu.turn_order ASC NULLS LAST`,
    [gameId],
  );

  const deckRow = await db.one<{ count: string }>(
    "SELECT COUNT(*) AS count FROM game_cards WHERE game_id = $1 AND location = 'deck'",
    [gameId],
  );

  const discardTop = await db.oneOrNone<Card>(
    `SELECT c.id, c.card_type, c.description
     FROM turn_actions ta JOIN cards c ON ta.card_id = c.id
     JOIN turns t ON ta.turn_id = t.id JOIN game_users gu ON t.game_player_id = gu.id
     WHERE gu.game_id = $1 ORDER BY ta.id DESC LIMIT 1`,
    [gameId],
  );

  const myHand = myGamePlayerId ? await fetchMyHand(gameId, myGamePlayerId) : [];
  const currentTurn = await getCurrentTurn(gameId);
  const winnerEmail = game.winner_id !== null ? await fetchWinnerEmail(game.winner_id) : null;
  const creator = await isCreator(gameId, userId);

  return {
    game_id: gameId,
    status: game.status,
    players,
    deck_size: parseInt(deckRow.count),
    discard_top: discardTop ?? null,
    my_hand: myHand,
    my_game_player_id: myGamePlayerId,
    current_game_player_id: currentTurn?.game_player_id ?? null,
    winner_email: winnerEmail,
    is_creator: creator,
  };
};

const drawCard = async (gameId: number, gamePlayerId: number): Promise<DrawResult> => {
  const topCard = await db.oneOrNone<Card>(
    `SELECT c.id, c.card_type, c.description
     FROM game_cards gc JOIN cards c ON gc.card_id = c.id
     WHERE gc.game_id = $1 AND gc.location = 'deck'
     ORDER BY gc.position ASC LIMIT 1`,
    [gameId],
  );
  if (!topCard) throw new Error("The deck is empty!");

  const currentTurn = await getCurrentTurn(gameId);
  if (currentTurn) {
    await db.none(
      "INSERT INTO turn_actions (turn_id, card_id, action_type) VALUES ($1, $2, 'draw')",
      [currentTurn.turn_id, topCard.id],
    );
  }

  if (topCard.card_type === "exploding_kitten") {
    const defuse = await db.oneOrNone<{ card_id: number }>(
      `SELECT gc.card_id FROM game_cards gc JOIN cards c ON gc.card_id = c.id
       WHERE gc.game_player_id = $1 AND gc.location = 'hand' AND c.card_type = 'defuse'
       LIMIT 1`,
      [gamePlayerId],
    );
    if (defuse) {
      return handleDefuseKitten(
        gameId,
        gamePlayerId,
        topCard,
        defuse.card_id,
        currentTurn?.turn_id ?? null,
      );
    }
    return handleExplodeKitten(gameId, gamePlayerId, topCard);
  }

  await db.none(
    "UPDATE game_cards SET location = 'hand', game_player_id = $1, position = NULL WHERE game_id = $2 AND card_id = $3",
    [gamePlayerId, gameId, topCard.id],
  );
  await endCurrentTurn(gameId, gamePlayerId);
  return { card: topCard, exploded: false, defused: false, turn_ended: true };
};

// Module-level helpers (add near the other private helpers)
const discardPlayedCard = async (gameId: number, cardId: number): Promise<void> => {
  await db.none(
    `UPDATE game_cards
     SET location = 'discard', game_player_id = NULL, position = NULL
     WHERE game_id = $1 AND card_id = $2`,
    [gameId, cardId],
  );
};

const getPlayerCardTypeIds = async (gamePlayerId: number, cardType: string): Promise<number[]> => {
  const results = await db.many<{ card_id: number }>(
    `SELECT
	GC.CARD_ID
FROM
	PUBLIC.GAME_CARDS AS GC
	INNER JOIN CARDS AS C ON C.ID = GC.CARD_ID
WHERE
	GC.GAME_PLAYER_ID = $1
	AND GC.LOCATION = 'hand'
	AND C.CARD_TYPE = $2`,
    [gamePlayerId, cardType],
  );
  const cardIds = results.map((value) => value.card_id);
  return cardIds;
};

const logTurnAction = async (
  turnId: number | null,
  cardId: number,
  actionType: string,
): Promise<void> => {
  if (turnId === null) return;
  await db.none("INSERT INTO turn_actions (turn_id, card_id, action_type) VALUES ($1, $2, $3)", [
    turnId,
    cardId,
    actionType,
  ]);
};

const stealCard = async (fromGamePlayerId: number, toGamePlaerId: number): Promise<void> => {
  await db.none(
    `UPDATE GAME_CARDS
SET
	GAME_PLAYER_ID = $1
WHERE
	GAME_PLAYER_ID = $2
	AND LOCATION = 'hand'
	AND CARD_ID IN (
		SELECT
			NGC.CARD_ID
		FROM
			GAME_CARDS NGC
		WHERE
			NGC.GAME_PLAYER_ID = $2
			AND NGC.LOCATION = 'hand'
		ORDER BY RANDOM()
		LIMIT 1
	);`,
    [toGamePlaerId, fromGamePlayerId],
  );
};

const applyStealCard = async (
  gameId: number,
  gamePlayerId: number,
  cardId: number,
  cardType: string,
  turnId: number | null,
  actionPlayerId?: number,
): Promise<PlayResult> => {
  const log = (action: string): Promise<void> => logTurnAction(turnId, cardId, action);
  const cardIds = await getPlayerCardTypeIds(gamePlayerId, cardType);
  const name = cardType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if (!cardIds[0] || !cardIds[1]) {
    return {
      success: false,
      message: `You don't have a ${name} cat-card pair.`,
      turn_ended: false,
      select_player: false,
    };
  }

  if (!actionPlayerId) {
    return {
      success: false,
      message: `select a player to steal from.`,
      turn_ended: false,
      select_player: true,
    };
  }

  await discardPlayedCard(gameId, cardIds[0]);
  await discardPlayedCard(gameId, cardIds[1]);
  await log("play_cat_pair");
  await stealCard(actionPlayerId, gamePlayerId);
  await endCurrentTurn(gameId, gamePlayerId);
  return {
    success: true,
    message: `card stealed.`,
    turn_ended: true,
    select_player: false,
  };
};
const applyCardEffect = async (
  gameId: number,
  gamePlayerId: number,
  cardId: number,
  cardType: string,
  turnId: number | null,
  actionPlayerId?: number,
): Promise<PlayResult> => {
  const discard = (): Promise<void> => discardPlayedCard(gameId, cardId);
  const log = (action: string): Promise<void> => logTurnAction(turnId, cardId, action);

  switch (cardType) {
    case "skip": {
      await discard();
      await log("play_skip");
      await endCurrentTurn(gameId, gamePlayerId);
      return { success: true, message: "Skipped! Next player's turn.", turn_ended: true };
    }
    case "attack": {
      await discard();
      await log("play_attack");
      await endCurrentTurn(gameId, gamePlayerId);
      return { success: true, message: "Attack! Your turn is over.", turn_ended: true };
    }
    case "shuffle": {
      await db.none(
        `UPDATE game_cards SET position = sub.pos
         FROM (SELECT card_id, ROW_NUMBER() OVER (ORDER BY random()) AS pos
               FROM game_cards WHERE game_id = $1 AND location = 'deck') sub
         WHERE game_cards.card_id = sub.card_id AND game_cards.game_id = $1`,
        [gameId],
      );
      await discard();
      await log("play_shuffle");
      await endCurrentTurn(gameId, gamePlayerId);
      return { success: true, message: "Deck shuffled! Next player's turn.", turn_ended: true };
    }
    case "see_the_future": {
      const peek = await db.any<Card>(
        `SELECT c.id, c.card_type, c.description FROM game_cards gc
         JOIN cards c ON gc.card_id = c.id
         WHERE gc.game_id = $1 AND gc.location = 'deck'
         ORDER BY gc.position ASC LIMIT 3`,
        [gameId],
      );
      await discard();
      await log("play_see_the_future");
      return { success: true, message: "You peek at the top 3 cards…", turn_ended: false, peek };
    }
    case "defuse":
      return {
        success: false,
        message: "Defuse can only be used when you draw an Exploding Kitten!",
        turn_ended: false,
      };
    case "nope":
      return { success: false, message: "Nope is not yet implemented.", turn_ended: false };
    case "favor":
      return { success: false, message: "Favor is not yet implemented.", turn_ended: false };
    default: {
      return await applyStealCard(gameId, gamePlayerId, cardId, cardType, turnId, actionPlayerId);
    }
  }
};

const playCard = async (
  gameId: number,
  gamePlayerId: number,
  cardId: number,
  actionPlayerId?: number,
): Promise<PlayResult> => {
  const card = await db.oneOrNone<Card>(
    `SELECT c.id, c.card_type, c.description FROM game_cards gc
     JOIN cards c ON gc.card_id = c.id
     WHERE gc.game_id = $1 AND gc.game_player_id = $2
       AND gc.card_id = $3 AND gc.location = 'hand'`,
    [gameId, gamePlayerId, cardId],
  );
  if (!card) {
    return { success: false, message: "Card not found in your hand", turn_ended: false };
  }
  const currentTurn = await getCurrentTurn(gameId);
  return applyCardEffect(
    gameId,
    gamePlayerId,
    cardId,
    card.card_type,
    currentTurn?.turn_id ?? null,
    actionPlayerId,
  );
};

export default {
  create,
  list,
  joinGame,
  playerCount,
  deal,
  state,
  // gameplay
  startGame,
  getFullState,
  getCurrentTurn,
  drawCard,
  playCard,
  getGameUserId,
  isCreator,
};
