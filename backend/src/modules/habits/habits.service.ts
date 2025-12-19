import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateHabitDto {
  name: string;
  frequency: string;
}

export interface UpdateHabitDto {
  name?: string;
  frequency?: string;
}

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.habit.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateHabitDto) {
    return this.prisma.habit.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateHabitDto) {
    return this.prisma.habit.update({
      where: { id },
      data: dto,
    });
  }

  async markCompleted(id: number) {
    const habit = await this.prisma.habit.findUnique({
      where: { id },
    });

    return this.prisma.habit.update({
      where: { id },
      data: {
        lastCompleted: new Date(),
        count: habit.count + 1,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.habit.delete({
      where: { id },
    });
  }
}

