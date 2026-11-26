import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppLogger } from './common/logging/app-logger';
import { createAccessLogMiddleware } from './common/logging/access-log.middleware';
import { requestIdMiddleware } from './common/logging/request-id.middleware';
import { logLevelsFor, resolveLogLevel } from './config/log-level';
import { parseTrustProxy } from './config/trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  // Logging: LOG_LEVEL picks how much is written; every line carries the request ID and
  // phone numbers and tokens are masked (see common/logging)
  app.useLogger(
    new AppLogger('', {
      logLevels: logLevelsFor(resolveLogLevel(process.env.LOG_LEVEL)),
      plain: process.env.NODE_ENV === 'production' || !!process.env.NO_COLOR, // no colour codes in production logs
    }),
  );
  app.use(requestIdMiddleware);
  app.use(createAccessLogMiddleware());

  // Behind a proxy (Railway, nginx) the client's address comes from X-Forwarded-For,
  // which Express only believes when told how many proxies to trust. The rate
  // limits count callers by IP address, so without this everyone looks like one caller.
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  } else if (process.env.NODE_ENV === 'production') {
    new Logger('Bootstrap').warn(
      'TRUST_PROXY is not set. If the API runs behind a proxy, all callers will share one IP address ' +
        'in the rate limits. Set TRUST_PROXY to the number of proxies in front of the API (for example 1).',
    );
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3001',  // Customer website
      'http://localhost:3002',  // Admin panel
      'http://localhost:8081',  // Mobile app (Expo web)
    ],
    credentials: true,
    exposedHeaders: ['X-Request-Id'], // lets the apps read the request ID from a reply
  });

  // Swagger / OpenAPI: on for development, off on a live API unless ENABLE_API_DOCS=true
  // (it lists every admin endpoint, which a public site has no need to show)
  const docsOn = process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true';
  if (docsOn) {
    const config = new DocumentBuilder()
      .setTitle('Juhar API')
      .setDescription('D2C Sambalpuri fashion e-commerce API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Juhar API running on http://localhost:${port}`);
  if (docsOn) logger.log(`📄 Swagger docs at http://localhost:${port}/api/docs`);
}

// A failed start (bad environment, no database) is reported plainly and stops the process with a failure code
bootstrap().catch((err) => {
  new Logger('Bootstrap').error(`The API could not start: ${err instanceof Error ? err.stack || err.message : String(err)}`);
  process.exit(1);
});
