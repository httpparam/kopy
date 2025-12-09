-- CreateTable
CREATE TABLE "pastes" (
    "id" TEXT NOT NULL,
    "encrypted_content" TEXT NOT NULL,
    "sender_name" TEXT,
    "password_hash" TEXT,
    "content_type" TEXT NOT NULL DEFAULT 'text',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pastes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pastes_expires_at" ON "pastes"("expires_at");
