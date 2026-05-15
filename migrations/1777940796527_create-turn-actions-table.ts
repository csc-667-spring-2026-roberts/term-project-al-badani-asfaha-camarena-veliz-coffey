// migrations/<timestamp>_create-turn-actions-table.ts
import { MigrationBuilder, PgType } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('turn_actions', {
        id: 'id',
        turn_id: {
            type: PgType.INTEGER,
            notNull: true,
            references: 'turns(id)',
            onDelete: 'CASCADE',
        },
        card_id: {
            type: PgType.INTEGER,
            references: 'cards(id)',
            onDelete: 'SET NULL',
        },
        action_type: { type: PgType.VARCHAR, notNull: true },
        created_at: {
            type: PgType.TIMESTAMP,
            notNull: true,
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('turn_actions');
}