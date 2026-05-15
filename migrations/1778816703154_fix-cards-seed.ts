import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DELETE FROM game_cards`);
  pgm.sql(`DELETE FROM cards`);
  pgm.sql(`ALTER TABLE cards DROP COLUMN IF EXISTS rank`);
  pgm.sql(`ALTER TABLE cards DROP COLUMN IF EXISTS suit`);
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
}

export async function down(_pgm: MigrationBuilder): Promise<void> {}