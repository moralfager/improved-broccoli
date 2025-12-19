import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Body,
  Get,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { join } from 'path';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('date') date: string,
    @Body('order') order?: string,
  ) {
    // Multer returns absolute path, convert to relative path from process.cwd()
    let filePath = file.path.replace(/\\/g, '/');
    const cwd = process.cwd().replace(/\\/g, '/');
    
    // Remove process.cwd() prefix to get relative path
    if (filePath.startsWith(cwd)) {
      filePath = filePath.substring(cwd.length);
      // Remove leading slash if present
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
    }
    
    // Remove ./ prefix if present
    if (filePath.startsWith('./')) {
      filePath = filePath.substring(2);
    }
    
    console.log(`Uploaded file: ${file.path} -> relative path: ${filePath}`);
    
    const photo = await this.mediaService.addPhoto(
      date,
      filePath,
      order ? Number(order) : 0,
    );

    return {
      id: photo.id,
      path: filePath,
      url: `/api/media/${filePath}`,
      order: photo.order,
    };
  }

  @Get(':path(*)')
  async serveFile(@Param('path') path: string, @Res() res: Response) {
    try {
      // Normalize path: remove leading slashes and ensure correct format
      let normalizedPath = path;
      if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1);
      }
      
      const filePath = join(process.cwd(), normalizedPath);
      
      console.log(`Serving file - requested path: ${path}, normalized: ${normalizedPath}, full path: ${filePath}, cwd: ${process.cwd()}`);
      
      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath} (requested path: ${path}, normalized: ${normalizedPath})`);
        return res.status(404).json({ 
          error: 'File not found',
          requestedPath: path,
          normalizedPath: normalizedPath,
          fullPath: filePath,
          cwd: process.cwd()
        });
      }
      
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving file:', error);
      return res.status(500).json({ error: 'Failed to serve file', details: error.message });
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(@Param('id') id: string) {
    return this.mediaService.deletePhoto(Number(id));
  }
}

