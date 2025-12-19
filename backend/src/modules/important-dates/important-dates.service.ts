import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateImportantDateDto {
  date: string;
  title: string;
  description?: string;
  category: string;
  isAnnual?: boolean;
}

export interface UpdateImportantDateDto {
  date?: string;
  title?: string;
  description?: string;
  category?: string;
  isAnnual?: boolean;
}

@Injectable()
export class ImportantDatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.importantDate.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async getUpcoming(limit = 5) {
    const now = new Date();
    const allDates = await this.prisma.importantDate.findMany();

    // Calculate next occurrence for each date
    const datesWithNextOccurrence = allDates.map(date => {
      const dateObj = new Date(date.date);
      let nextOccurrence = new Date(dateObj);

      if (date.isAnnual) {
        // Set to this year
        nextOccurrence.setFullYear(now.getFullYear());
        
        // If already passed this year, use next year
        if (nextOccurrence < now) {
          nextOccurrence.setFullYear(now.getFullYear() + 1);
        }
      }

      const daysUntil = Math.ceil(
        (nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...date,
        nextOccurrence,
        daysUntil,
      };
    });

    // Filter upcoming and sort by days until
    return datesWithNextOccurrence
      .filter(d => d.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, limit);
  }

  async getById(id: number) {
    return this.prisma.importantDate.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateImportantDateDto) {
    return this.prisma.importantDate.create({
      data: {
        date: new Date(dto.date),
        title: dto.title,
        description: dto.description,
        category: dto.category,
        isAnnual: dto.isAnnual || false,
      },
    });
  }

  async update(id: number, dto: UpdateImportantDateDto) {
    const data: any = {};

    if (dto.date) data.date = new Date(dto.date);
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category) data.category = dto.category;
    if (dto.isAnnual !== undefined) data.isAnnual = dto.isAnnual;

    return this.prisma.importantDate.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.importantDate.delete({
      where: { id },
    });
  }
}

