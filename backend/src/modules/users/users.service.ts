import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  telegram?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only allow 2 specific users for this private diary app (zhumakhan and zhaniyat)
    const allowedEmails = ['zhumakhan@diary.local', 'zhaniyat@diary.local'];
    if (!allowedEmails.includes(dto.email)) {
      throw new ConflictException('Only zhumakhan and zhaniyat users are allowed');
    }

    return this.prisma.user.create({
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        password: true,
        telegram: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateAvatar(userId: number, avatar: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
  }

  async updateName(userId: number, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
  }

  async updateEmail(userId: number, email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Email already in use');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
  }

  async updateTelegram(userId: number, telegram: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { telegram },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        telegram: true,
      },
    });
  }
}

