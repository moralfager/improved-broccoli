import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  telegram?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    const token = this.generateToken(user.id, user.email);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      ...token,
    };
  }

  async login(dto: LoginDto) {
    // Only allow zhumakhan and zhaniyat
    const allowedUsers = {
      'zhumakhan': { name: 'Жумахан', email: 'zhumakhan@diary.local' },
      'zhaniyat': { name: 'Жаният', email: 'zhaniyat@diary.local' },
    };

    const userInfo = allowedUsers[dto.username as keyof typeof allowedUsers];
    if (!userInfo) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password (67sixseven)
    const correctPassword = '67sixseven';
    if (dto.password !== correctPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find or create user
    let user = await this.usersService.findByEmail(userInfo.email);
    if (!user) {
      // Create user if doesn't exist
      const hashedPassword = await bcrypt.hash(correctPassword, 10);
      await this.usersService.create({
        email: userInfo.email,
        password: hashedPassword,
        name: userInfo.name,
      });
      // Fetch the created user with password
      user = await this.usersService.findByEmail(userInfo.email);
      if (!user) {
        throw new UnauthorizedException('Failed to create user');
      }
    } else {
      // Verify password from database
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const token = this.generateToken(user.id, user.email);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      ...token,
    };
  }

  async validateUser(userId: number) {
    return this.usersService.findById(userId);
  }

  private generateToken(userId: number, email: string) {
    const payload = { sub: userId, email };
    
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    };
  }
}

