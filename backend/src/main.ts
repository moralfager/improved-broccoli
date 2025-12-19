import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL || 'http://localhost:3000')
      : true, // В development разрешаем все origin для тестирования
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

