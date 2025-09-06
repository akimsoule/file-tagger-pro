-- AlterTable
ALTER TABLE "document_embeddings" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "megaFileId" TEXT,
ADD COLUMN     "storageMode" TEXT NOT NULL DEFAULT 'db',
ALTER COLUMN "embedding" DROP NOT NULL;
