import { MigrationBuilder, PgType } from 'node-pg-migrate';


export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.sql('TRUNCATE TABLE game_cards');
    pgm.sql('TRUNCATE TABLE cards RESTART IDENTITY CASCADE');

    pgm.dropColumn('cards', 'rank');
    pgm.dropColumn('cards', 'suit');

    pgm.addColumn('cards', {
        card_type: { type: PgType.VARCHAR, notNull: true },
        description: { type: 'text' },
    });

    // Seed Exploding Kittens deck
    const cards: { card_type: string; description: string; count: number }[] = [
        { card_type: 'exploding_kitten', description: 'You must defuse this or you explode and are out of the game.', count: 4 },
        { card_type: 'defuse',           description: 'Use this to defuse an Exploding Kitten. Place the kitten back in the deck anywhere you like.', count: 6 },
        { card_type: 'attack',           description: 'End your turn without drawing. The next player must take 2 turns.', count: 4 },
        { card_type: 'skip',             description: 'End your turn without drawing a card.', count: 4 },
        { card_type: 'favor',            description: 'Force another player to give you one card of their choice.', count: 4 },
        { card_type: 'shuffle',          description: 'Shuffle the draw pile and end your turn without drawing.', count: 4 },
        { card_type: 'see_the_future',   description: 'Secretly look at the top 3 cards of the draw pile.', count: 5 },
        { card_type: 'nope',             description: 'Stop any action except an Exploding Kitten or Defuse.', count: 5 },
        { card_type: 'taco_cat',         description: 'A cat card. Collect pairs to steal cards from other players.', count: 4 },
        { card_type: 'hairy_potato_cat', description: 'A cat card. Collect pairs to steal cards from other players.', count: 4 },
        { card_type: 'cattermelon',      description: 'A cat card. Collect pairs to steal cards from other players.', count: 4 },
        { card_type: 'rainbow_cat',      description: 'A cat card. Collect pairs to steal cards from other players.', count: 4 },
        { card_type: 'beard_cat',        description: 'A cat card. Collect pairs to steal cards from other players.', count: 4 },
    ];

    for (const card of cards) {
        for (let i = 0; i < card.count; i++) {
            pgm.sql(
                `INSERT INTO cards (card_type, description) VALUES ('${card.card_type}', '${card.description}')`
            );
        }
    }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql('TRUNCATE TABLE game_cards');
    pgm.sql('TRUNCATE TABLE cards RESTART IDENTITY CASCADE');

    pgm.dropColumn('cards', 'card_type');
    pgm.dropColumn('cards', 'description');

    pgm.addColumn('cards', {
        rank: { type: PgType.SMALLINT, notNull: true },
        suit: { type: PgType.CHAR, notNull: true },
    });

    pgm.sql("INSERT INTO cards (rank, suit) SELECT r, s FROM generate_series(2, 14) r CROSS JOIN unnest(ARRAY['H', 'D', 'C', 'S']) s");
}
