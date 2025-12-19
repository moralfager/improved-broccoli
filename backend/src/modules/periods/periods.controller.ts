import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PeriodsService, CreatePeriodDto, UpdatePeriodDto } from './periods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('periods')
@UseGuards(JwtAuthGuard)
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @Get()
  async getAll() {
    return this.periodsService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.periodsService.getById(Number(id));
  }

  @Post()
  async create(@Body() dto: CreatePeriodDto) {
    return this.periodsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.periodsService.update(Number(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.periodsService.delete(Number(id));
  }
}

