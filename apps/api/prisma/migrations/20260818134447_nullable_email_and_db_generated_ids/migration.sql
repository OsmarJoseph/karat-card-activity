-- AlterTable
ALTER TABLE "authorizations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "cardholders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cards" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
