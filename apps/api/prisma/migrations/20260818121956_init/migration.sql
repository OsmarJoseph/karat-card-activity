-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('active', 'inactive', 'canceled');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('pending', 'closed', 'reversed', 'expired');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('capture', 'refund');

-- CreateEnum
CREATE TYPE "SpendCategory" AS ENUM ('food_drink', 'groceries', 'shopping', 'transport', 'travel', 'entertainment', 'software', 'utilities', 'health', 'professional_services', 'fees', 'other');

-- CreateTable
CREATE TABLE "cardholders" (
    "id" UUID NOT NULL,
    "stripe_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cardholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "stripe_id" TEXT NOT NULL,
    "cardholder_id" UUID NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorizations" (
    "id" UUID NOT NULL,
    "stripe_id" TEXT NOT NULL,
    "card_id" UUID NOT NULL,
    "cardholder_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "AuthorizationStatus" NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "merchant_mcc" TEXT NOT NULL,
    "merchant_category" TEXT NOT NULL,
    "category" "SpendCategory" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "last_event_at" TIMESTAMPTZ(3) NOT NULL,
    "raw" JSONB NOT NULL,

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "stripe_id" TEXT NOT NULL,
    "authorization_id" TEXT,
    "card_id" UUID NOT NULL,
    "cardholder_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "merchant_mcc" TEXT NOT NULL,
    "merchant_category" TEXT NOT NULL,
    "category" "SpendCategory" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "last_event_at" TIMESTAMPTZ(3) NOT NULL,
    "raw" JSONB NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cardholders_stripe_id_key" ON "cardholders"("stripe_id");

-- CreateIndex
CREATE UNIQUE INDEX "cards_stripe_id_key" ON "cards"("stripe_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorizations_stripe_id_key" ON "authorizations"("stripe_id");

-- CreateIndex
CREATE INDEX "authorizations_cardholder_id_occurred_at_id_idx" ON "authorizations"("cardholder_id", "occurred_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "authorizations_cardholder_id_status_idx" ON "authorizations"("cardholder_id", "status");

-- CreateIndex
CREATE INDEX "authorizations_cardholder_id_category_occurred_at_idx" ON "authorizations"("cardholder_id", "category", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripe_id_key" ON "transactions"("stripe_id");

-- CreateIndex
CREATE INDEX "transactions_cardholder_id_occurred_at_id_idx" ON "transactions"("cardholder_id", "occurred_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "transactions_cardholder_id_category_occurred_at_idx" ON "transactions"("cardholder_id", "category", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_authorization_id_idx" ON "transactions"("authorization_id");

-- CreateIndex
CREATE INDEX "stripe_events_processed_at_idx" ON "stripe_events"("processed_at");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_cardholder_id_fkey" FOREIGN KEY ("cardholder_id") REFERENCES "cardholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_cardholder_id_fkey" FOREIGN KEY ("cardholder_id") REFERENCES "cardholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cardholder_id_fkey" FOREIGN KEY ("cardholder_id") REFERENCES "cardholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
