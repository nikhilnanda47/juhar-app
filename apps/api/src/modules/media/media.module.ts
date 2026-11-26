import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { resolveMediaConfig } from '../../config/media-config';
import { MediaService } from './media.service';
import { STORAGE_PROVIDER, createStorage } from './storage';

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = {
          NODE_ENV: config.get('NODE_ENV'), PORT: config.get('PORT'), UPLOAD_DIR: config.get('UPLOAD_DIR'),
          MEDIA_PUBLIC_URL: config.get('MEDIA_PUBLIC_URL'), R2_ACCOUNT_ID: config.get('R2_ACCOUNT_ID'),
          R2_ACCESS_KEY_ID: config.get('R2_ACCESS_KEY_ID'), R2_SECRET_ACCESS_KEY: config.get('R2_SECRET_ACCESS_KEY'),
          R2_BUCKET: config.get('R2_BUCKET'),
        };
        const resolved = resolveMediaConfig(env);
        const logger = new Logger('Media');
        if (resolved.kind === 'none') {
          logger.warn(
            'No photo storage is set (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, MEDIA_PUBLIC_URL). ' +
              'Uploading product photos is refused until it is: a live server\'s own disk is wiped on every deploy.',
          );
        } else if (resolved.kind === 'local') {
          logger.log(`Product photos are kept in ${resolved.dir} and served at ${resolved.publicUrl}`);
        } else {
          logger.log(`Product photos are kept in the R2 bucket "${resolved.bucket}", public at ${resolved.publicUrl}`);
        }
        return createStorage(resolved);
      },
    },
    MediaService,
  ],
  exports: [MediaService, STORAGE_PROVIDER],
})
export class MediaModule {}
