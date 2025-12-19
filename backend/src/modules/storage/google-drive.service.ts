import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GoogleDriveService {
  private oauth2Client: any;
  private drive: any;
  private folderId: string;
  private tokensPath: string;

  constructor(private readonly prisma: PrismaService) {
    // ID папки в Google Drive
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1rGNf3YTubyXde9m26SA8UwGJnRU7M3XC';
    
    // Путь для сохранения токенов
    this.tokensPath = join(process.cwd(), 'google-oauth-tokens.json');

    // Загружаем OAuth credentials (client_id, client_secret)
    // Эти credentials нужно создать в Google Cloud Console для OAuth 2.0 Client ID
    const credentialsPath = join(process.cwd(), 'google-oauth-credentials.json');
    
    if (!existsSync(credentialsPath)) {
      console.warn('Google OAuth credentials not found. Please create google-oauth-credentials.json');
      console.warn('OAuth endpoints will not work until credentials are provided.');
      // Не прерываем инициализацию, но OAuth не будет работать
      return;
    }

    try {
      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));

      if (!credentials.client_id || !credentials.client_secret) {
        console.error('Google OAuth credentials file is missing client_id or client_secret');
        return;
      }

      // Инициализация OAuth 2.0 клиента
      this.oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/storage/oauth/callback`,
      );

      console.log('Google OAuth client initialized successfully');
    } catch (error) {
      console.error('Error loading Google OAuth credentials:', error);
    }

    // Загружаем сохраненные токены (если есть)
    this.loadTokens();

    // Инициализация Google Drive API
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Загружает сохраненные токены из файла
   */
  private loadTokens() {
    if (existsSync(this.tokensPath)) {
      try {
        const tokens = JSON.parse(readFileSync(this.tokensPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
      } catch (error) {
        console.error('Error loading tokens:', error);
      }
    }
  }

  /**
   * Сохраняет токены в файл
   */
  private saveTokens(tokens: any) {
    try {
      writeFileSync(this.tokensPath, JSON.stringify(tokens, null, 2));
      this.oauth2Client.setCredentials(tokens);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Получает URL для авторизации OAuth
   */
  async getAuthUrl(): Promise<string> {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized. Please create google-oauth-credentials.json file.');
    }

    const scopes = ['https://www.googleapis.com/auth/drive'];
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Получаем refresh token
      scope: scopes,
      prompt: 'consent', // Принудительно запрашиваем согласие для получения refresh token
    });

    return authUrl;
  }

  /**
   * Обменивает код авторизации на токены
   */
  async setCredentialsFromCode(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.saveTokens(tokens);
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Проверяет, авторизован ли пользователь
   */
  async isAuthorized(): Promise<boolean> {
    if (!this.oauth2Client) {
      return false;
    }

    try {
      // Проверяем, есть ли токены
      const credentials = this.oauth2Client.credentials;
      if (!credentials || !credentials.access_token) {
        return false;
      }

      // Проверяем, не истек ли токен, и обновляем если нужно
      if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
        if (credentials.refresh_token) {
          await this.oauth2Client.refreshAccessToken();
          const newTokens = this.oauth2Client.credentials;
          this.saveTokens(newTokens);
        } else {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking authorization:', error);
      return false;
    }
  }

  /**
   * Загружает файл в Google Drive
   * @param fileBuffer - Buffer файла
   * @param fileName - Имя файла
   * @param mimeType - MIME тип файла (например, 'image/jpeg')
   * @returns Объект с fileId и URL для доступа к файлу
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string = 'image/jpeg',
  ) {
    // Проверяем авторизацию перед загрузкой
    const isAuthorized = await this.isAuthorized();
    if (!isAuthorized) {
      throw new Error('Google Drive not authorized. Please authorize first via /api/storage/oauth/authorize');
    }

    try {
      // Преобразуем Buffer в Stream (Google Drive API требует stream)
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null); // Завершаем stream

      // Медиа файла
      const media = {
        mimeType: mimeType,
        body: bufferStream,
      };

      // Метаданные файла
      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : [],
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, thumbnailLink, parents',
        supportsAllDrives: true,
      });

      const fileId = response.data.id;

      // Делаем файл публично доступным для чтения
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });

      // Получаем прямую ссылку для отображения изображения
      const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      const thumbnailUrl = response.data.thumbnailLink || imageUrl;

      return {
        fileId: fileId,
        name: response.data.name,
        url: imageUrl, // Прямая ссылка для отображения в <img>
        viewUrl: response.data.webViewLink, // Ссылка для просмотра в Google Drive
        thumbnailUrl: thumbnailUrl,
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Более подробное сообщение об ошибке
      let errorMessage = error.message || 'Unknown error';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      
      throw new Error(`Failed to upload file to Google Drive: ${errorMessage}`);
    }
  }

  /**
   * Удаляет файл из Google Drive
   * @param fileId - ID файла в Google Drive
   */
  async deleteFile(fileId: string) {
    const isAuthorized = await this.isAuthorized();
    if (!isAuthorized) {
      throw new Error('Google Drive not authorized');
    }

    try {
      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error(`Failed to delete file from Google Drive: ${error.message}`);
    }
  }

  /**
   * Получает публичную ссылку на файл
   * @param fileId - ID файла в Google Drive
   * @returns URL для отображения изображения
   */
  getPublicUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  /**
   * Загружает все новые фотографии в Google Drive
   * Пропускает фотографии, которые уже загружены (имеют googleDriveId)
   */
  async uploadAllPhotos(): Promise<{
    uploaded: number;
    skipped: number;
    errors: number;
    results: Array<{ photoId: number; success: boolean; error?: string }>;
  }> {
    const isAuthorized = await this.isAuthorized();
    if (!isAuthorized) {
      throw new Error('Google Drive not authorized. Please authorize first via /api/storage/oauth/authorize');
    }

    // Получаем все фотографии, которые еще не загружены в Google Drive
    const photos = await this.prisma.photo.findMany({
      where: {
        googleDriveId: null, // Только те, которые еще не загружены
      },
      include: {
        day: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const results: Array<{ photoId: number; success: boolean; error?: string; fileId?: string }> = [];
    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const photo of photos) {
      try {
        // Читаем файл с диска
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), photo.url);

        if (!fs.existsSync(fullPath)) {
          results.push({
            photoId: photo.id,
            success: false,
            error: 'File not found on disk',
          });
          errors++;
          continue;
        }

        const fileBuffer = fs.readFileSync(fullPath);
        const fileName = path.basename(photo.url);
        
        // Определяем MIME тип
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
        };
        const mimeType = mimeTypes[ext] || 'image/jpeg';

        // Загружаем в Google Drive
        const result = await this.uploadFile(fileBuffer, fileName, mimeType);

        // Обновляем запись в базе данных
        await this.prisma.photo.update({
          where: { id: photo.id },
          data: {
            googleDriveId: result.fileId,
            googleDriveUrl: result.url,
          },
        });

        results.push({
          photoId: photo.id,
          success: true,
          fileId: result.fileId,
        });
        uploaded++;
      } catch (error) {
        console.error(`Error uploading photo ${photo.id}:`, error);
        results.push({
          photoId: photo.id,
          success: false,
          error: error.message || 'Unknown error',
        });
        errors++;
      }
    }

    // Подсчитываем пропущенные (уже загруженные)
    const alreadyUploaded = await this.prisma.photo.count({
      where: {
        googleDriveId: { not: null },
      },
    });
    skipped = alreadyUploaded;

    return {
      uploaded,
      skipped,
      errors,
      results,
    };
  }

  /**
   * Экспортирует timeline данные в JSON
   */
  async exportTimelineJSON(): Promise<any> {
    const days = await this.prisma.calendarDay.findMany({
      orderBy: { date: 'desc' },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    return days.map(day => ({
      date: day.date.toISOString().split('T')[0],
      title: day.title || null,
      mood: day.mood || null,
      note: day.note || null,
      place: day.place || null,
      photos: day.photos.map(photo => ({
        id: photo.id,
        localUrl: `${API_URL}/api/media/${photo.url}`,
        googleDriveUrl: photo.googleDriveUrl || null,
        googleDriveId: photo.googleDriveId || null,
        path: photo.url,
        order: photo.order,
        createdAt: photo.createdAt.toISOString(),
      })),
      items: day.items.map(item => ({
        id: item.id,
        type: item.type,
        text: item.text,
        time: item.time || null,
        createdAt: item.createdAt.toISOString(),
      })),
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
    }));
  }

  /**
   * Экспортирует timeline данные в CSV
   */
  async exportTimelineCSV(): Promise<string> {
    const data = await this.exportTimelineJSON();
    
    // CSV Header
    const headers = ['Date', 'Title', 'Mood', 'Note', 'Place', 'Photos (Local)', 'Photos (Google Drive)', 'Created At', 'Updated At'];
    
    // CSV Rows
    const rows = data.map(day => [
      day.date,
      day.title || '',
      day.mood || '',
      (day.note || '').replace(/"/g, '""'), // Escape quotes
      day.place || '',
      day.photos.map(p => p.localUrl).join('; '),
      day.photos.map(p => p.googleDriveUrl || '').filter(url => url).join('; '),
      day.createdAt,
      day.updatedAt,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
