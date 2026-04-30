import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLeaveRequestStatusValues1775555200000 implements MigrationInterface {
    name = 'UpdateLeaveRequestStatusValues1775555200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "leave_requests" SET "status" = 'granted' WHERE "status" = 'approved'`);
        await queryRunner.query(`UPDATE "leave_requests" SET "status" = 'rejected' WHERE "status" = 'denied'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "leave_requests" SET "status" = 'approved' WHERE "status" = 'granted'`);
        await queryRunner.query(`UPDATE "leave_requests" SET "status" = 'denied' WHERE "status" = 'rejected'`);
    }

}
