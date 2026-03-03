import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLeaveEntities1772380515080 implements MigrationInterface {
    name = 'AddLeaveEntities1772380515080'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "leave_requests" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "numberOfDays" integer NOT NULL, "reason" text NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "reviewedBy" integer, "reviewedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d3abcf9a16cef1450129e06fa9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "leave_allocations" ("id" SERIAL NOT NULL, "employeeId" integer NOT NULL, "totalLeaveDays" integer NOT NULL, "usedDays" integer NOT NULL DEFAULT '0', "remainingDays" integer NOT NULL, "year" integer NOT NULL, CONSTRAINT "PK_d6f97727d0437c65c1e0d73f7a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_4eda1468756ca831495e308e407" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_42418c2a17d0c4fcc2bdb4ccaea" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_allocations" ADD CONSTRAINT "FK_0bb5b6d97a527dab3c329321e32" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_allocations" DROP CONSTRAINT "FK_0bb5b6d97a527dab3c329321e32"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_42418c2a17d0c4fcc2bdb4ccaea"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_4eda1468756ca831495e308e407"`);
        await queryRunner.query(`DROP TABLE "leave_allocations"`);
        await queryRunner.query(`DROP TABLE "leave_requests"`);
    }

}
