import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1738407600000 implements MigrationInterface {
  name = 'AddDeletedAtToUsers1738407600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column to users table for soft delete functionality
    // This column is nullable - null means the user is active,
    // a timestamp means the user has been soft deleted
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deletedAt" TIMESTAMP NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: remove the deletedAt column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedAt"`);
  }
}
