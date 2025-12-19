import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreatePeriodDto {
  name: string;
  startDate: string;
  endDate?: string;
  color: string;
  order?: number;
}

export interface UpdatePeriodDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
  order?: number;
}

@Injectable()
export class PeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.relationshipPeriod.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async getById(id: number) {
    return this.prisma.relationshipPeriod.findUnique({
      where: { id },
    });
  }

  async create(dto: CreatePeriodDto) {
    return this.prisma.relationshipPeriod.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        color: dto.color,
        order: dto.order || 0,
      },
    });
  }

  async update(id: number, dto: UpdatePeriodDto) {
    const data: any = {};
    
    if (dto.name) data.name = dto.name;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }
    if (dto.color) data.color = dto.color;
    if (dto.order !== undefined) data.order = dto.order;

    return this.prisma.relationshipPeriod.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.relationshipPeriod.delete({
      where: { id },
    });
  }

  async getPeriodForDate(date: Date) {
    const periods = await this.getAll();
    
    for (const period of periods) {
      const start = new Date(period.startDate);
      const end = period.endDate ? new Date(period.endDate) : new Date('2099-12-31');
      
      if (date >= start && date <= end) {
        return period;
      }
    }
    
    return null;
  }
}

