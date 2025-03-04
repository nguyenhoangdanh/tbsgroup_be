/*
  Warnings:

  - Added the required column `card_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'first_login';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "card_id" VARCHAR(100) NOT NULL,
ADD COLUMN     "department" VARCHAR(100) NOT NULL,
ADD COLUMN     "employee_id" VARCHAR(100) NOT NULL,
ADD COLUMN     "position" VARCHAR(100) NOT NULL;
