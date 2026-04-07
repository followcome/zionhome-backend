import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProcurementTable1773820020819 implements MigrationInterface {
    name = 'CreateProcurementTable1773820020819'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "procurements" ("id" SERIAL NOT NULL, "equipmentName" character varying(255) NOT NULL, "unitPrice" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "totalPrice" numeric(12,2) NOT NULL, "addedBy" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_af0852935077e606571f906d7ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "procurements" ADD CONSTRAINT "FK_5d7b7fa8dd1b73563288464da67" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "procurements" DROP CONSTRAINT "FK_5d7b7fa8dd1b73563288464da67"`);
        await queryRunner.query(`DROP TABLE "procurements"`);
    }

}
