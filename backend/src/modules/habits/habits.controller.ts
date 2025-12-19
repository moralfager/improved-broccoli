import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { HabitsService, CreateHabitDto, UpdateHabitDto } from './habits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get()
  async getAll() {
    return this.habitsService.getAll();
  }

  @Post()
  async create(@Body() dto: CreateHabitDto) {
    return this.habitsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHabitDto) {
    return this.habitsService.update(Number(id), dto);
  }

  @Patch(':id/complete')
  async markCompleted(@Param('id') id: string) {
    return this.habitsService.markCompleted(Number(id));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.habitsService.delete(Number(id));
  }
}

