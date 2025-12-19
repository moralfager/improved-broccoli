import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SurprisesService, CreateSurpriseDto } from './surprises.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('surprises')
@UseGuards(JwtAuthGuard)
export class SurprisesController {
  constructor(private readonly surprisesService: SurprisesService) {}

  @Post()
  async create(@Body() dto: CreateSurpriseDto) {
    return this.surprisesService.create(dto);
  }

  @Get('available')
  async getAvailable() {
    return this.surprisesService.getAvailable();
  }

  @Get('check/:date')
  async checkForDate(@Param('date') date: string) {
    return this.surprisesService.checkForDate(date);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.surprisesService.delete(Number(id));
  }
}

