import { MigrationInterface, QueryRunner } from 'typeorm';

// Initial migration: creates the base "users" table.
//
// This MUST run before any other migration because every other table
// (attendances, leave_requests, salaries, etc.) adds a foreign key that
// references users("id"), and 1738407600000-AddDeletedAtToUsers /
// 1774627200000-AddUserProfileColumns ALTER this table to add more columns.
// TypeORM runs migrations in ascending timestamp order, and this timestamp
// (1700000000000) is the smallest, so it executes first.
//
// Only the ORIGINAL user columns are created here. Columns added by later
// migrations are intentionally excluded so those ALTERs do not fail with
// "column already exists":
//   - deletedAt                       -> added by 1738407600000
//   - middleName, phone, gender, picture -> added by 1774627200000
//
// CREATE TABLE IF NOT EXISTS keeps this idempotent: on a fresh database
// (e.g. Render) it creates the table; on an existing database where the
// table was already created via an earlier synchronize, it is a safe no-op.
export class CreateUsersTable1700000000000 implements MigrationInterface {
  name = 'CreateUsersTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "failedAttempts" integer NOT NULL DEFAULT 0,
        "isLocked" boolean NOT NULL DEFAULT false,
        "refreshToken" character varying,
        "role" character varying NOT NULL DEFAULT 'employee',
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
