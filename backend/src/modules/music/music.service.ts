import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateMusicTrackDto {
  title: string;
  artist?: string;
  url?: string;
}

@Injectable()
export class MusicService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMusicTrackDto) {
    return this.prisma.musicTrack.create({
      data: dto,
    });
  }

  async getPlaylist() {
    return this.prisma.musicTrack.findMany({
      include: {
        calendarDays: {
          select: {
            id: true,
            date: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: number) {
    return this.prisma.musicTrack.delete({
      where: { id },
    });
  }
}

