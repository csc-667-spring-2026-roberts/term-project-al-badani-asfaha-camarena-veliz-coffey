import db from "./connection.js";
import { Game, GameListItem, User } from "../types/types.js";

const create = async (user_id: number): Promise<GameListItem> => {
  const game = await db.one<Game>("INSERT INTO games DEFAULT VALUES RETURNING *");

  await db.none("INSERT INTO game_users (game_id, user_id) VALUES ($1, $2)", [game.id, user_id]);
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

export default { create, list };
