import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.sql("INSERT INTO users (id, email, password_hash, gravatar_url) VALUES (0, 'dealer@example.com', '$2b$10$example_hash', '')")
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql("DELETE FROM users WHERE id = 0");
}
