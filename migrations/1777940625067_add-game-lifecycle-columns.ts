import { MigrationBuilder, PgType } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.addColumn('games', {
        started_at: { type: PgType.TIMESTAMP },
        ended_at:   { type: PgType.TIMESTAMP },
        winner_id:  {
            type: PgType.INTEGER,
            references: 'game_users(id)',
            onDelete: 'SET NULL',
        },
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropColumn('games', 'winner_id');
    pgm.dropColumn('games', 'ended_at');
    pgm.dropColumn('games', 'started_at');
}
