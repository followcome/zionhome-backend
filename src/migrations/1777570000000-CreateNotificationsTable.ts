import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationsTable1777570000000 implements MigrationInterface {
    name = 'CreateNotificationsTable1777570000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "title" character varying(255) NOT NULL, "message" character varying NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b0f4b10d4fce8b58f1f2d16f7a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}
