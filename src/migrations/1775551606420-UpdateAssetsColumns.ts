import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAssetsColumns1775551606420 implements MigrationInterface {
    name = 'UpdateAssetsColumns1775551606420'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "UQ_asset_serial_number"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "serialNumber"`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "amount" numeric(12,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "currency" character varying(3) NOT NULL DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "purchasedOn" date NOT NULL DEFAULT CURRENT_DATE`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "quantity" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "image" character varying`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "receipt" character varying`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "amount" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "currency" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "purchasedOn" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "quantity" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "receipt"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "purchasedOn"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "assets" ADD "serialNumber" character varying(100)`);
        await queryRunner.query(`UPDATE "assets" SET "serialNumber" = CONCAT('SERIAL-', "id") WHERE "serialNumber" IS NULL`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "serialNumber" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "UQ_asset_serial_number" UNIQUE ("serialNumber")`);
    }

}
