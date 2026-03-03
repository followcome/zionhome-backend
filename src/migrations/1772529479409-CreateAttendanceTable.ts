import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAttendanceTable1772529479409 implements MigrationInterface {
    name = 'CreateAttendanceTable1772529479409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "attendances" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "date" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_employee_date" UNIQUE ("employeeId", "date"), CONSTRAINT "PK_483ed97cd4cd43ab4a117516b69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "attendances" ADD CONSTRAINT "FK_4a9f77d05b9c764ff1053401cdd" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT "FK_4a9f77d05b9c764ff1053401cdd"`);
        await queryRunner.query(`DROP TABLE "attendances"`);
    }

}
