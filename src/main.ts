import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app, configService);

  const port = configService.get<number>('PORT') ?? 8080;
  await app.listen(port);
}

function configureApp(app: INestApplication, configService: ConfigService) {
  app.useGlobalPipes(getValidationPipe());
  app.use(cookieParser());
  app.enableCors(getCorsOptions(configService.get('FRONTEND_URL')));
}

const getValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

const getCorsOptions = (origin?: string) => ({
  origin: process.env.NODE_ENV === 'development' ? true : origin,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true,
});

bootstrap();
