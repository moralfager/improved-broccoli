import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LettersService, CreateLetterDto } from './letters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('letters')
@UseGuards(JwtAuthGuard)
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

  @Get()
  async getAll() {
    return this.lettersService.getAll();
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateLetterDto) {
    return this.lettersService.create(req.user.id, dto);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.lettersService.markAsRead(Number(id));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.lettersService.delete(Number(id));
  }
}

