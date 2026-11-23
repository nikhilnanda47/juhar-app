import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { parseTrustProxy } from './config/trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3001',  // Customer website
      'http://localhost:3002',  // Admin panel
      'http://localhost:8081',  // Mobile app (Expo web)
    ],
    credentials: true,
  });

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Juhar API')
    .setDescription('D2C Sambalpuri fashion e-commerce API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Juhar API running on http://localhost:${port}`);
  console.log(`📄 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
