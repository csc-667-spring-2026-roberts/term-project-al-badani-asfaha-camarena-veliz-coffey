// migrations/<timestamp>_create-turns-table.ts
import { MigrationBuilder, PgType } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('turns', {
        id: 'id',
        game_player_id: {
            type: PgType.INTEGER,
            notNull: true,
            references: 'game_users(id)',
            onDelete: 'CASCADE',
        },
        turn_number: { type: PgType.INTEGER, notNull: true },
        created_at: {
            type: PgType.TIMESTAMP,
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('turns');
}