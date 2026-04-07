import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAssetTables1773840095383 implements MigrationInterface {
    name = 'CreateAssetTables1773840095383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "assets" ("id" SERIAL NOT NULL, "assetName" character varying(255) NOT NULL, "serialNumber" character varying(100) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'available', "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_asset_serial_number" UNIQUE ("serialNumber"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asset_assignments" ("id" SERIAL NOT NULL, "assetId" integer NOT NULL, "employeeId" integer NOT NULL, "assignedAt" TIMESTAMP NOT NULL DEFAULT now(), "returnedAt" TIMESTAMP, CONSTRAINT "PK_20629cd9ab403e64604ce5e36b3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "asset_assignments" ADD CONSTRAINT "FK_94349daf29f445266f3dddc4df9" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_assignments" ADD CONSTRAINT "FK_35e8b4e59ccc8303f7872dffdd9" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_assignments" DROP CONSTRAINT "FK_35e8b4e59ccc8303f7872dffdd9"`);
        await queryRunner.query(`ALTER TABLE "asset_assignments" DROP CONSTRAINT "FK_94349daf29f445266f3dddc4df9"`);
        await queryRunner.query(`DROP TABLE "asset_assignments"`);
        await queryRunner.query(`DROP TABLE "assets"`);
    }

}
