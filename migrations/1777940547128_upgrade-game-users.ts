import { MigrationBuilder, PgType } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.dropConstraint('game_users', 'game_users_pkey');

    pgm.addColumn('game_users', {
        id: {
            type: PgType.SERIAL,
            notNull: true,
        },
    });

    pgm.addConstraint('game_users', 'game_users_pkey', { primaryKey: ['id'] });

    // Keep (game_id, user_id) unique — a user can only be in a game once
    pgm.addConstraint('game_users', 'game_users_game_user_unique', {
        unique: ['game_id', 'user_id'],
    });

    pgm.addColumn('game_users', {
        is_alive: { type: PgType.BOOLEAN, notNull: true, default: true },
        turn_order: { type: PgType.INTEGER },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropColumn('game_users', 'turn_order');
    pgm.dropColumn('game_users', 'is_alive');
    pgm.dropConstraint('game_users', 'game_users_game_user_unique');
    pgm.dropConstraint('game_users', 'game_users_pkey');
    pgm.dropColumn('game_users', 'id');
    pgm.addConstraint('game_users', 'game_users_pkey', { primaryKey: ['game_id', 'user_id'] });
}
