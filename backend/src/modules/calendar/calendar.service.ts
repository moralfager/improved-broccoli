import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateDayDto {
  date: string;
  title?: string;
  mood?: string;
  note?: string;
  place?: string;
  musicTrackId?: number;
  tags?: string;
}

export interface UpdateDayDto {
  title?: string;
  mood?: string;
  note?: string;
  place?: string;
  musicTrackId?: number;
  tags?: string;
}

export interface CreateItemDto {
  type: 'plan' | 'note' | 'gift' | 'place';
  text: string;
  time?: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getDays(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [days, total] = await Promise.all([
      this.prisma.calendarDay.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          photos: {
            orderBy: { order: 'asc' },
          },
          items: {
            orderBy: { createdAt: 'asc' },
          },
          musicTrack: true,
        },
      }),
      this.prisma.calendarDay.count(),
    ]);

    // Map url to path for frontend compatibility
    const mappedDays = days.map(day => ({
      ...day,
      photos: day.photos.map(photo => ({
        ...photo,
        path: photo.url,
      })),
    }));

    return {
      days: mappedDays,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDaysByDateRange(startDate: string, endDate: string) {
    const days = await this.prisma.calendarDay.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        musicTrack: true,
      },
    });

    // Map url to path for frontend compatibility
    const mappedDays = days.map(day => ({
      ...day,
      photos: day.photos.map(photo => ({
        ...photo,
        path: photo.url,
      })),
    }));

    return {
      days: mappedDays,
      startDate,
      endDate,
      total: days.length,
    };
  }

  async getDay(date: string) {
    const day = await this.prisma.calendarDay.findUnique({
      where: { date: new Date(date) },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        musicTrack: true,
      },
    });

    if (!day) return null;

    // Map url to path for frontend compatibility
    return {
      ...day,
      photos: day.photos.map(photo => ({
        ...photo,
        path: photo.url,
      })),
    };
  }

  async createOrUpdateDay(dto: CreateDayDto) {
    const date = new Date(dto.date);
    
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.mood !== undefined) updateData.mood = dto.mood;
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.place !== undefined) updateData.place = dto.place;
    if (dto.musicTrackId !== undefined) updateData.musicTrackId = dto.musicTrackId;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    
    const day = await this.prisma.calendarDay.upsert({
      where: { date },
      update: updateData,
      create: {
        date,
        title: dto.title,
        mood: dto.mood,
        note: dto.note,
        place: dto.place,
        musicTrackId: dto.musicTrackId,
        tags: dto.tags,
      },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        musicTrack: true,
      },
    });

    // Map url to path for frontend compatibility
    return {
      ...day,
      photos: day.photos.map(photo => ({
        ...photo,
        path: photo.url,
      })),
    };
  }

  async addItem(date: string, dto: CreateItemDto) {
    // First, ensure the day exists
    await this.createOrUpdateDay({ date });

    const day = await this.prisma.calendarDay.findUnique({
      where: { date: new Date(date) },
    });

    return this.prisma.calendarItem.create({
      data: {
        dayId: day.id,
        type: dto.type,
        text: dto.text,
        time: dto.time,
      },
    });
  }

  async deleteItem(itemId: number) {
    return this.prisma.calendarItem.delete({
      where: { id: itemId },
    });
  }

  async deleteDay(date: string) {
    const dayDate = new Date(date);
    
    // Find the day with photos
    const day = await this.prisma.calendarDay.findUnique({
      where: { date: dayDate },
      include: { photos: true },
    });

    if (!day) {
      throw new NotFoundException('Day not found');
    }

    // Delete all photos first (files will be deleted by media service)
    const fs = require('fs');
    const path = require('path');
    
    for (const photo of day.photos) {
      // Delete file from disk
      const fullPath = path.join(process.cwd(), photo.url);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      
      // Delete from database
      await this.prisma.photo.delete({
        where: { id: photo.id },
      });
    }

    // Delete all items
    await this.prisma.calendarItem.deleteMany({
      where: { dayId: day.id },
    });

    // Delete the day
    await this.prisma.calendarDay.delete({
      where: { date: dayDate },
    });

    return { success: true };
  }
}

