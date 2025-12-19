import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Put('name')
  async updateName(@Request() req, @Body('name') name: string) {
    return this.usersService.updateName(req.user.id, name);
  }

  @Put('email')
  async updateEmail(@Request() req, @Body('email') email: string) {
    return this.usersService.updateEmail(req.user.id, email);
  }

  @Put('password')
  async updatePassword(
    @Request() req,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.usersService.updatePassword(req.user.id, currentPassword, newPassword);
  }

  @Put('telegram')
  async updateTelegram(@Request() req, @Body('telegram') telegram: string) {
    return this.usersService.updateTelegram(req.user.id, telegram);
  }
}

