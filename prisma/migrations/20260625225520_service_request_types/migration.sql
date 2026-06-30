-- CreateTable
CREATE TABLE "service_request_types" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "original_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_request_types_service_id_idx" ON "service_request_types"("service_id");

-- AddForeignKey
ALTER TABLE "service_request_types" ADD CONSTRAINT "service_request_types_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
