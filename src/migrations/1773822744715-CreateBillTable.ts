import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillTable1773822744715 implements MigrationInterface {
    name = 'CreateBillTable1773822744715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bills" ("id" SERIAL NOT NULL, "description" character varying(500) NOT NULL, "cost" numeric(12,2) NOT NULL, "receiptUrl" character varying(500), "addedBy" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a56215dfcb525755ec832cc80b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "bills" ADD CONSTRAINT "FK_8e9c698479e3e0f0a507fb91793" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_8e9c698479e3e0f0a507fb91793"`);
        await queryRunner.query(`DROP TABLE "bills"`);
    }

}
