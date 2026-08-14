-- AlterTable
ALTER TABLE "beats" ADD COLUMN "mood" TEXT;
ALTER TABLE "beats" ADD COLUMN "waveformPeaks" TEXT;

-- CreateIndex
CREATE INDEX "beats_mood_idx" ON "beats"("mood");
