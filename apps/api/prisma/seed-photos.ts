// Sample pictures for development: draws Sambalpuri-style fabric pictures and attaches them to sarees that have no
// photo yet, so the shop, the app and the admin can be seen with photos before the real ones exist.
//
//   cd apps/api
//   npm run db:seed:photos                       # every saree without a photo
//   npm run db:seed:photos -- --prefix demo-     # only the demo sarees
//   npm run db:seed:photos -- --limit 20
//   npm run db:seed:photos -- --remove           # take the sample pictures off again
//
// Each picture says SAMPLE PICTURE and its description starts with "Sample picture", so they cannot be mistaken for the
// real thing and `--remove` can find them. Real photos are never touched. Like the other sample seeds, this refuses to
// run against a database that is not on this computer, and it keeps the files in this computer's photo folder only.
import { PrismaClient } from '@prisma/client';
import { seedRefusal } from '../src/common/local-database-guard';
import { resolveMediaConfig } from '../src/config/media-config';
import { LocalStorage } from '../src/modules/media/storage';
import { MediaService } from '../src/modules/media/media.service';
import { addSamplePhotos, removeSamplePhotos } from '../src/common/sample-photos/seed';
import { parseSamplePhotoArgs, SAMPLE_PHOTOS_USAGE } from '../src/common/sample-photos/plan';

async function main() {
  const refusal = seedRefusal(process.env, 'db:seed:photos');
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
  let args;
  try {
    args = parseSamplePhotoArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${(err as Error).message}\n\n${SAMPLE_PHOTOS_USAGE}`);
    process.exit(1);
  }

  // The pictures go in this computer's photo folder, never in a live bucket
  const config = resolveMediaConfig(process.env);
  if (config.kind !== 'local') {
    console.error(
      'Refusing to run db:seed:photos: photo storage is set to ' +
        (config.kind === 'r2' ? 'a Cloudflare R2 bucket' : 'nothing (a live setup)') +
        '. Sample pictures are only kept in the folder on this computer: unset the R2_* settings for this run.',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const media = new MediaService(prisma as never, new LocalStorage(config.dir, config.publicUrl));
    const log = (line: string) => console.log(line);
    if (args.remove) {
      const done = await removeSamplePhotos(prisma, media, args, log);
      console.log(done.photos ? `Removed ${done.photos} sample pictures from ${done.sarees} sarees.` : 'There were no sample pictures to remove.');
      return;
    }
    console.log(`Adding sample pictures (files in ${config.dir}, shown at ${config.publicUrl})...`);
    const done = await addSamplePhotos(prisma, media, args, log);
    console.log(
      `Done: ${done.photos} sample pictures on ${done.sarees} sarees` +
        (done.skipped ? ` (${done.skipped} sarees already had photos and were left alone)` : '') +
        '. Remove them any time with: npm run db:seed:photos -- --remove',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Could not add the sample pictures:', err instanceof Error ? err.message : err);
  process.exit(1);
});
