import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandProcurementsForUploads1777600000000 implements MigrationInterface {
    name = 'ExpandProcurementsForUploads1777600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "procurements" ADD "currency" character varying(3) NOT NULL DEFAULT 'NGN'`);
        await queryRunner.query(`ALTER TABLE "procurements" ADD "purchasedOn" date`);
        await queryRunner.query(`ALTER TABLE "procurements" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "procurements" ADD "assignTo" integer`);
        await queryRunner.query(`ALTER TABLE "procurements" ADD "imageUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "procurements" ADD "receiptUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "procurements" DROP COLUMN "receiptUrl"`);
        await queryRunner.query(`ALTER TABLE "procurements" DROP COLUMN "imageUrl"`);
        await queryRunner.query(`ALTER TABLE "procurements" DROP COLUMN "assignTo"`);
        await queryRunner.query(`ALTER TABLE "procurements" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "procurements" DROP COLUMN "purchasedOn"`);
        await queryRunner.query(`ALTER TABLE "procurements" DROP COLUMN "currency"`);
    }

}
