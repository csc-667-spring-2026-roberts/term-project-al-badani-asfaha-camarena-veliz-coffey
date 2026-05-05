import { MigrationBuilder, PgType } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createType('card_location', ['deck', 'hand', 'discard']);

    pgm.addColumn('game_cards', {
        location: {
            type: 'card_location',
            notNull: true,
            default: 'deck',
        },
        game_player_id: {
            type: PgType.INTEGER,
            references: 'game_users(id)',
            onDelete: 'SET NULL',
        },
    });

    pgm.sql(`
        UPDATE game_cards gc
        SET location = 'hand',
            game_player_id = gu.id
        FROM game_users gu
        WHERE gc.user_id = gu.user_id
          AND gc.game_id = gu.game_id
          AND gc.user_id != 0
    `);

    pgm.renameColumn('game_cards', 'pile_position', 'position');

    pgm.dropColumn('game_cards', 'user_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.addColumn('game_cards', {
        user_id: { type: PgType.INTEGER, notNull: true, default: 0 },
    });

    pgm.sql(`
        UPDATE game_cards gc
        SET user_id = gu.user_id
        FROM game_users gu
        WHERE gc.game_player_id = gu.id
    `);

    pgm.renameColumn('game_cards', 'position', 'pile_position');
    pgm.dropColumn('game_cards', 'game_player_id');
    pgm.dropColumn('game_cards', 'location');
    pgm.dropType('card_location');
}