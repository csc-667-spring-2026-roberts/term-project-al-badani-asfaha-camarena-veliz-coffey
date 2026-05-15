import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── cards: add new columns, re-seed with EK cards ──────────────
  pgm.sql(`ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type TEXT`);
  pgm.sql(`ALTER TABLE cards ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`);
  pgm.sql(`ALTER TABLE cards DROP COLUMN IF EXISTS rank`);
  pgm.sql(`ALTER TABLE cards DROP COLUMN IF EXISTS suit`);
  pgm.sql(`DELETE FROM game_cards`);
  pgm.sql(`DELETE FROM cards`);
  pgm.sql(`INSERT INTO cards (card_type, description) VALUES
    ('exploding_kitten', 'You explode! Unless you have a Defuse card.'),
    ('exploding_kitten', 'You explode! Unless you have a Defuse card.'),
    ('exploding_kitten', 'You explode! Unless you have a Defuse card.'),
    ('exploding_kitten', 'You explode! Unless you have a Defuse card.'),
    ('defuse', 'Defuse an Exploding Kitten and put it back in the deck wherever you like.'),
    ('defuse', 'Defuse an Exploding Kitten and put it back in the deck wherever you like.'),
    ('defuse', 'Defuse an Exploding Kitten and put it back in the deck wherever you like.'),
    ('defuse', 'Defuse an Exploding Kitten and put it back in the deck wherever you like.'),
    ('defuse', 'Defuse an Exploding Kitten and put it back in the deck wherever you like.'),
    ('defuse', 'Defuse an Exploding Kitten and put it back in the deck wherever you like.'),
    ('skip', 'End your turn without drawing a card.'),
    ('skip', 'End your turn without drawing a card.'),
    ('skip', 'End your turn without drawing a card.'),
    ('skip', 'End your turn without drawing a card.'),
    ('attack', 'End your turn without drawing. Force the next player to take 2 turns.'),
    ('attack', 'End your turn without drawing. Force the next player to take 2 turns.'),
    ('attack', 'End your turn without drawing. Force the next player to take 2 turns.'),
    ('attack', 'End your turn without drawing. Force the next player to take 2 turns.'),
    ('shuffle', 'Shuffle the draw pile and end your turn.'),
    ('shuffle', 'Shuffle the draw pile and end your turn.'),
    ('shuffle', 'Shuffle the draw pile and end your turn.'),
    ('shuffle', 'Shuffle the draw pile and end your turn.'),
    ('see_the_future', 'Privately view the top 3 cards of the draw pile.'),
    ('see_the_future', 'Privately view the top 3 cards of the draw pile.'),
    ('see_the_future', 'Privately view the top 3 cards of the draw pile.'),
    ('see_the_future', 'Privately view the top 3 cards of the draw pile.'),
    ('see_the_future', 'Privately view the top 3 cards of the draw pile.'),
    ('nope', 'Stop any action except an Exploding Kitten or Defuse.'),
    ('nope', 'Stop any action except an Exploding Kitten or Defuse.'),
    ('nope', 'Stop any action except an Exploding Kitten or Defuse.'),
    ('nope', 'Stop any action except an Exploding Kitten or Defuse.'),
    ('nope', 'Stop any action except an Exploding Kitten or Defuse.'),
    ('favor', 'Force any player to give you 1 card of their choice.'),
    ('favor', 'Force any player to give you 1 card of their choice.'),
    ('favor', 'Force any player to give you 1 card of their choice.'),
    ('favor', 'Force any player to give you 1 card of their choice.'),
    ('taco_cat', 'Play as a pair to steal a random card from any player.'),
    ('taco_cat', 'Play as a pair to steal a random card from any player.'),
    ('taco_cat', 'Play as a pair to steal a random card from any player.'),
    ('taco_cat', 'Play as a pair to steal a random card from any player.'),
    ('hairy_potato_cat', 'Play as a pair to steal a random card from any player.'),
    ('hairy_potato_cat', 'Play as a pair to steal a random card from any player.'),
    ('hairy_potato_cat', 'Play as a pair to steal a random card from any player.'),
    ('hairy_potato_cat', 'Play as a pair to steal a random card from any player.'),
    ('cattermelon', 'Play as a pair to steal a random card from any player.'),
    ('cattermelon', 'Play as a pair to steal a random card from any player.'),
    ('cattermelon', 'Play as a pair to steal a random card from any player.'),
    ('cattermelon', 'Play as a pair to steal a random card from any player.'),
    ('rainbow_cat', 'Play as a pair to steal a random card from any player.'),
    ('rainbow_cat', 'Play as a pair to steal a random card from any player.'),
    ('rainbow_cat', 'Play as a pair to steal a random card from any player.'),
    ('rainbow_cat', 'Play as a pair to steal a random card from any player.'),
    ('beard_cat', 'Play as a pair to steal a random card from any player.'),
    ('beard_cat', 'Play as a pair to steal a random card from any player.'),
    ('beard_cat', 'Play as a pair to steal a random card from any player.'),
    ('beard_cat', 'Play as a pair to steal a random card from any player.')
  `);
  pgm.sql(`ALTER TABLE cards DROP COLUMN IF EXISTS rank`);
  pgm.sql(`ALTER TABLE cards DROP COLUMN IF EXISTS suit`);

  // ── game_cards: add location + game_player_id, rename pile_position ──
  pgm.sql(`DO $$ BEGIN
    CREATE TYPE card_location AS ENUM ('deck', 'hand', 'discard');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  pgm.sql(`ALTER TABLE game_cards ADD COLUMN IF NOT EXISTS location card_location NOT NULL DEFAULT 'deck'`);
  pgm.sql(`ALTER TABLE game_cards ADD COLUMN IF NOT EXISTS game_player_id INTEGER REFERENCES game_users(id) ON DELETE CASCADE`);
  pgm.sql(`DO $$ BEGIN
    ALTER TABLE game_cards RENAME COLUMN pile_position TO position;
  EXCEPTION WHEN undefined_column THEN NULL; END $$`);
  pgm.sql(`ALTER TABLE game_cards ALTER COLUMN position DROP NOT NULL`);
  pgm.sql(`ALTER TABLE game_cards DROP COLUMN IF EXISTS user_id`);

  // ── games: add winner_id, started_at, ended_at ─────────────────
  pgm.sql(`ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_id INTEGER REFERENCES game_users(id) ON DELETE SET NULL`);
  pgm.sql(`ALTER TABLE games ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`);
  pgm.sql(`ALTER TABLE games ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP`);

  // ── game_users: add is_alive, turn_order ───────────────────────
  pgm.sql(`ALTER TABLE game_users ADD COLUMN IF NOT EXISTS is_alive BOOLEAN DEFAULT false`);
  pgm.sql(`ALTER TABLE game_users ADD COLUMN IF NOT EXISTS turn_order INTEGER`);

  // ── turns table ────────────────────────────────────────────────
  pgm.sql(`CREATE TABLE IF NOT EXISTS turns (
    id SERIAL PRIMARY KEY,
    game_player_id INTEGER NOT NULL REFERENCES game_users(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  // ── turn_actions table ─────────────────────────────────────────
  pgm.sql(`CREATE TABLE IF NOT EXISTS turn_actions (
    id SERIAL PRIMARY KEY,
    turn_id INTEGER NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL
  )`);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {}