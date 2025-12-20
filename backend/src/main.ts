import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (() => {
        const frontendUrl = process.env.FRONTEND_URL || 'https://heartofzha.ru';
        // Разрешаем основной домен и www версию
        if (frontendUrl.startsWith('https://www.')) {
          return [frontendUrl, frontendUrl.replace('https://www.', 'https://')];
        } else if (frontendUrl.startsWith('https://')) {
          return [frontendUrl, frontendUrl.replace('https://', 'https://www.')];
        }
        return [frontendUrl, 'https://heartofzha.ru', 'https://www.heartofzha.ru'];
      })()
    : true; // В development разрешаем все origin для тестирования

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}

bootstrap();

