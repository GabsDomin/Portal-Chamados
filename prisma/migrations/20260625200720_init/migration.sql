-- CreateTable
CREATE TABLE "portal_profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "caller_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Cliente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_profiles_pkey" PRIMARY KEY ("id")
);
