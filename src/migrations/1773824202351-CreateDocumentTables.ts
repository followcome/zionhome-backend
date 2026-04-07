import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDocumentTables1773824202351 implements MigrationInterface {
    name = 'CreateDocumentTables1773824202351'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "documents" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "fileUrl" character varying(500), "uploadedBy" integer, "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_assignments" ("id" SERIAL NOT NULL, "documentId" integer NOT NULL, "employeeId" integer NOT NULL, "assignedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_document_employee" UNIQUE ("documentId", "employeeId"), CONSTRAINT "PK_a9d2ed7e3bd600eddc942566a2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_236dfbbac76eceda26294a645de" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_assignments" ADD CONSTRAINT "FK_b62d30e338139939587975a4906" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_assignments" ADD CONSTRAINT "FK_c4c717e4cdd48525e87ffde6909" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_assignments" DROP CONSTRAINT "FK_c4c717e4cdd48525e87ffde6909"`);
        await queryRunner.query(`ALTER TABLE "document_assignments" DROP CONSTRAINT "FK_b62d30e338139939587975a4906"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_236dfbbac76eceda26294a645de"`);
        await queryRunner.query(`DROP TABLE "document_assignments"`);
        await queryRunner.query(`DROP TABLE "documents"`);
    }

}
