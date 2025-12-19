import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateSurpriseDto {
  revealDate: string;
  title: string;
  description?: string;
}

@Injectable()
export class SurprisesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSurpriseDto) {
    return this.prisma.surprise.create({
      data: {
        revealDate: new Date(dto.revealDate),
        title: dto.title,
        description: dto.description,
      },
    });
  }

  async getAvailable() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.surprise.findMany({
      where: {
        revealDate: {
          lte: today,
        },
        isRevealed: true,
      },
      orderBy: { revealDate: 'desc' },
    });
  }

  async checkForDate(date: string) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const surprise = await this.prisma.surprise.findFirst({
      where: {
        revealDate: checkDate,
        isRevealed: false,
      },
    });

    if (surprise) {
      // Mark as revealed
      await this.prisma.surprise.update({
        where: { id: surprise.id },
        data: { isRevealed: true },
      });
      return surprise;
    }

    return null;
  }

  async delete(id: number) {
    return this.prisma.surprise.delete({
      where: { id },
    });
  }
}

