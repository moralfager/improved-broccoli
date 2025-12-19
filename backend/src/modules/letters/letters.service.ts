import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateLetterDto {
  text: string;
}

@Injectable()
export class LettersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.letter.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(authorId: number, dto: CreateLetterDto) {
    return this.prisma.letter.create({
      data: {
        authorId,
        text: dto.text,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async markAsRead(id: number) {
    return this.prisma.letter.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async delete(id: number) {
    return this.prisma.letter.delete({
      where: { id },
    });
  }
}

