import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSalaryTables1772696861701 implements MigrationInterface {
    name = 'CreateSalaryTables1772696861701'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "salaries" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "effectiveDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_20ca60aa8d4201c7bcb430fdb36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "salary_payments" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "month" integer NOT NULL, "year" integer NOT NULL, "amountPaid" numeric(12,2) NOT NULL, "paymentDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_employee_month_year" UNIQUE ("employeeId", "month", "year"), CONSTRAINT "PK_dde0dd5e8632eef035da694183a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "salaries" ADD CONSTRAINT "FK_46a9b162964c14cb310140da0d7" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "salary_payments" ADD CONSTRAINT "FK_560ddea8f2290d4dd59aeafac4e" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "salary_payments" DROP CONSTRAINT "FK_560ddea8f2290d4dd59aeafac4e"`);
        await queryRunner.query(`ALTER TABLE "salaries" DROP CONSTRAINT "FK_46a9b162964c14cb310140da0d7"`);
        await queryRunner.query(`DROP TABLE "salary_payments"`);
        await queryRunner.query(`DROP TABLE "salaries"`);
    }

}
