-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "ipAddress" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "userAgent" TEXT NOT NULL DEFAULT 'Unknown';
