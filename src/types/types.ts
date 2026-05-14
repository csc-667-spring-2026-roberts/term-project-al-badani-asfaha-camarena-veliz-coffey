import { Request } from "express";

export interface TypedRequestBody<T> extends Request {
  body: T;
}

export interface UserLoginRequestBody {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  gravatar_url: string;
  created_at: Date;
}

export interface DbUser extends User {
  password_hash: string;
}

export interface GameUserState extends Pick<User, "email" | "gravatar_url"> {
  card_count: number;
}

export enum GameStatus {
  "waiting",
  "started",
  "ended",
}

export interface Game {
  id: number;
  status: GameStatus;
  created_at: Date;
}

export interface GameListItem {
  id: number;
  status: GameStatus;
  created_at: Date;
  creator_email: string;
  player_count: number;
}

export interface GameState {
  players: GameUserState[];
}

export enum EventTypes {
  games_updated = "games_updated",
  game_state_updated = "game_state_updated",
  game_message = "game_message",
}

// Gameplay Types

export interface Card {
  id: number;
  card_type: string;
  description: string;
}

export interface PlayerState {
  id: number;
  user_id: number;
  email: string;
  gravatar_url: string;
  card_count: number;
  is_alive: boolean;
  turn_order: number | null;
}

export interface DetailedGameState {
  game_id: number;
  status: string;
  players: PlayerState[];
  deck_size: number;
  discard_top: Card | null;
  my_hand: Card[];
  my_game_player_id: number | null;
  current_game_player_id: number | null;
  winner_email: string | null;
  is_creator: boolean;
}

export interface DrawResult {
  card: Card;
  exploded: boolean;
  defused: boolean;
  turn_ended: boolean;
}

export interface PlayResult {
  success: boolean;
  message: string;
  turn_ended: boolean;
  peek?: Card[];
}
