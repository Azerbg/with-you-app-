/*
  Warnings:

  - You are about to drop the `fluency_reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fluency_reports" DROP CONSTRAINT "fluency_reports_lessonId_fkey";

-- DropTable
DROP TABLE "fluency_reports";
