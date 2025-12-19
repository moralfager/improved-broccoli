import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async addPhoto(date: string, filePath: string, order = 0) {
    // Ensure the day exists
    const dayDate = new Date(date);
    
    let day = await this.prisma.calendarDay.findUnique({
      where: { date: dayDate },
    });

    if (!day) {
      day = await this.prisma.calendarDay.create({
        data: { date: dayDate },
      });
    }

    // Get current max order if order not specified
    if (order === 0) {
      const maxPhoto = await this.prisma.photo.findFirst({
        where: { dayId: day.id },
        orderBy: { order: 'desc' },
      });
      order = maxPhoto ? maxPhoto.order + 1 : 0;
    }

    return this.prisma.photo.create({
      data: {
        dayId: day.id,
        url: filePath,
        order,
      },
    });
  }

  async getPhotos(dayId: number) {
    return this.prisma.photo.findMany({
      where: { dayId },
      orderBy: { order: 'asc' },
    });
  }

  async deletePhoto(photoId: number) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (photo) {
      // Delete file from disk
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), photo.url);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // Delete from database
      await this.prisma.photo.delete({
        where: { id: photoId },
      });
    }

    return { success: true };
  }
}

