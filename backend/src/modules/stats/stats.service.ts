import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTimeline() {
    const days = await this.prisma.calendarDay.findMany({
      orderBy: { date: 'desc' },
      include: {
        photos: {
          orderBy: { order: 'asc' },
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
        url: `${API_URL}/api/media/${photo.url}`,
        path: photo.url,
        order: photo.order,
        createdAt: photo.createdAt.toISOString(),
      })),
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
    }));
  }

  async exportTimelineCSV() {
    const data = await this.exportTimeline();
    
    // CSV Header
    const headers = ['Date', 'Title', 'Mood', 'Note', 'Place', 'Photos', 'Created At', 'Updated At'];
    
    // CSV Rows
    const rows = data.map(day => [
      day.date,
      day.title || '',
      day.mood || '',
      (day.note || '').replace(/"/g, '""'), // Escape quotes
      day.place || '',
      day.photos.map(p => p.url).join('; '),
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

