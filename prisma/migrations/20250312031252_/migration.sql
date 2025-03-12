/*
  Warnings:

  - You are about to drop the column `default_role_id` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_default_role_id_fkey";

-- AlterTable
ALTER TABLE "user_role_assignments" ADD COLUMN     "expiry_date" DATE;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "default_role_id",
ADD COLUMN     "role_id" UUID;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
