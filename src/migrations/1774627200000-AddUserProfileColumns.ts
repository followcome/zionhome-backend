import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileColumns1774627200000 implements MigrationInterface {
  name = 'AddUserProfileColumns1774627200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "middleName" character varying NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phone" character varying NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "gender" character varying NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "picture" character varying NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "picture"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "middleName"`);
  }
}
