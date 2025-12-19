import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlansService, CreatePlanDto, UpdatePlanDto } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async getAll(
    @Query('upcoming') upcoming?: string,
    @Query('past') past?: string,
    @Query('type') type?: string,
  ) {
    const filters = {
      upcoming: upcoming === 'true',
      past: past === 'true',
      type,
    };
    return this.plansService.getAll(filters);
  }

  @Get('today')
  async getToday() {
    return this.plansService.getToday();
  }

  @Get('upcoming')
  async getUpcoming(@Query('days') days?: string) {
    return this.plansService.getUpcoming(days ? Number(days) : 5);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.plansService.getById(Number(id));
  }

  @Post()
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(Number(id), dto);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string) {
    return this.plansService.complete(Number(id));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.plansService.delete(Number(id));
  }
}

