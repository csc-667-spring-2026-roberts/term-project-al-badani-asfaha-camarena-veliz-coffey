import db from "./connection.js";
import { Game, GameListItem, GameUserState, User } from "../types/types.js";

const create = async (user_id: number): Promise<GameListItem> => {
  const game = await db.one<Game>("INSERT INTO games DEFAULT VALUES RETURNING *");

  await db.none("INSERT INTO game_users (game_id, user_id, seat) VALUES ($1, $2, 0)", [
    game.id,
    user_id,
  ]);

  await db.none(
    `
    INSERT INTO game_cards (game_id, card_id, user_id, pile_position)
    SELECT $1, cards.id, 0, ROW_NUMBER() OVER (ORDER BY random())
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
  SET user_id=$1
  WHERE game_id=$2
  AND card_id IN (
    SELECT card_id FROM game_cards
    WHERE game_id=$2 AND user_id=0
    ORDER BY random()
    LIMIT 7
)`;

const deal = async (gameId: number): Promise<void> => {
  const players = await db.any<{ user_id: number }>(
    "SELECT user_id FROM game_users WHERE game_id=$1",
    [gameId],
  );

  for (const player of players) {
    await db.none(DEAL_SQL, [player.user_id, gameId]);
  }
};

const state = async (gameId: number): Promise<GameUserState[]> =>
  await db.many<GameUserState>(
    `SELECT users.email, users.gravatar_url, (
      SELECT COUNT(*) FROM game_cards
      WHERE game_cards.game_id=$1 AND game_cards.user_id=users.id
    ) AS card_count
    FROM users
    JOIN game_users ON game_users.user_id = users.id
    WHERE game_users.game_id = $1
    ORDER BY game_users.seat ASC`,
    [gameId],
  );

export default { create, list, joinGame, playerCount, deal, state };
