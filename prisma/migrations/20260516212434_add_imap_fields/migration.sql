-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN "imapHost" TEXT;
ALTER TABLE "EmailAccount" ADD COLUMN "imapPort" INTEGER;
ALTER TABLE "EmailAccount" ADD COLUMN "passwordEncrypted" TEXT;
