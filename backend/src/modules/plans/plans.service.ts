import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreatePlanDto {
  date: string;
  time?: string;
  title: string;
  description?: string;
  type: string;
  location?: string;
  repeat?: string;
  reminder?: boolean;
}

export interface UpdatePlanDto {
  date?: string;
  time?: string;
  title?: string;
  description?: string;
  type?: string;
  location?: string;
  isCompleted?: boolean;
  repeat?: string;
  reminder?: boolean;
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(filters?: { upcoming?: boolean; past?: boolean; type?: string }) {
    const where: any = {};
    const now = new Date();

    if (filters?.upcoming) {
      where.date = { gte: now };
      where.isCompleted = false;
    }

    if (filters?.past) {
      where.OR = [
        { date: { lt: now } },
        { isCompleted: true },
      ];
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    return this.prisma.plan.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async getToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.plan.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        isCompleted: false,
      },
      orderBy: { time: 'asc' },
    });
  }

  async getUpcoming(days = 5) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.plan.findMany({
      where: {
        date: {
          gte: now,
          lt: endDate,
        },
        isCompleted: false,
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 10,
    });
  }

  async getById(id: number) {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        date: new Date(dto.date),
        time: dto.time,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        location: dto.location,
        repeat: dto.repeat,
        reminder: dto.reminder || false,
      },
    });
  }

  async update(id: number, dto: UpdatePlanDto) {
    const data: any = {};

    if (dto.date) data.date = new Date(dto.date);
    if (dto.time !== undefined) data.time = dto.time;
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type) data.type = dto.type;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.isCompleted !== undefined) data.isCompleted = dto.isCompleted;
    if (dto.repeat !== undefined) data.repeat = dto.repeat;
    if (dto.reminder !== undefined) data.reminder = dto.reminder;

    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async complete(id: number) {
    return this.prisma.plan.update({
      where: { id },
      data: { isCompleted: true },
    });
  }

  async delete(id: number) {
    return this.prisma.plan.delete({
      where: { id },
    });
  }
}

