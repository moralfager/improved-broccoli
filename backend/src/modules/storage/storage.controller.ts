import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Get,
  Res,
  Query,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GoogleDriveService } from './google-drive.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response, Request } from 'express';

@Controller('storage')
export class StorageController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  /**
   * Endpoint для загрузки файла в Google Drive
   * Используется для тестирования и загрузки отдельных файлов
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Используем memory storage для получения buffer
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Test upload - File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Загружаем в Google Drive
    const result = await this.googleDriveService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return {
      success: true,
      message: 'File uploaded to Google Drive successfully',
      file: {
        id: result.fileId,
        name: result.name,
        url: result.url, // Используйте эту ссылку в <img src={url} />
        viewUrl: result.viewUrl, // Ссылка для просмотра в Google Drive
        thumbnailUrl: result.thumbnailUrl,
      },
    };
  }

  /**
   * Проверка статуса Google Drive
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus() {
    const isAuthorized = await this.googleDriveService.isAuthorized();
    return {
      success: true,
      message: 'Google Drive service is ready',
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '1rGNf3YTubyXde9m26SA8UwGJnRU7M3XC',
      isAuthorized,
    };
  }

  /**
   * Начало OAuth потока - перенаправляет на Google для авторизации
   * Этот endpoint публичный, так как он только генерирует URL для перенаправления
   */
  @Get('oauth/authorize')
  async authorize(@Res() res: Response) {
    try {
      const authUrl = await this.googleDriveService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({
        error: 'Failed to generate authorization URL',
        message: error.message,
      });
    }
  }

  /**
   * Callback от Google OAuth - получает код и обменивает на токен
   */
  @Get('oauth/callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/storage?error=no_code`);
    }

    try {
      await this.googleDriveService.setCredentialsFromCode(code);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/storage?success=true`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/storage?error=auth_failed`);
    }
  }

  /**
   * Проверка статуса авторизации
   */
  @Get('oauth/status')
  @UseGuards(JwtAuthGuard)
  async getAuthStatus() {
    const isAuthorized = await this.googleDriveService.isAuthorized();
    return {
      isAuthorized,
    };
  }

  /**
   * Массовая загрузка всех новых фотографий в Google Drive
   */
  @Post('upload-all-photos')
  @UseGuards(JwtAuthGuard)
  async uploadAllPhotos() {
    return await this.googleDriveService.uploadAllPhotos();
  }

  /**
   * Экспорт timeline в JSON
   */
  @Get('export/json')
  @UseGuards(JwtAuthGuard)
  async exportJSON(@Res() res: Response) {
    const data = await this.googleDriveService.exportTimelineJSON();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="timeline-export.json"');
    res.json(data);
  }

  /**
   * Экспорт timeline в CSV
   */
  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  async exportCSV(@Res() res: Response) {
    const csv = await this.googleDriveService.exportTimelineCSV();
    // Add UTF-8 BOM for proper Cyrillic support in Excel
    const BOM = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="timeline-export.csv"');
    res.send(BOM + csv);
  }
}

