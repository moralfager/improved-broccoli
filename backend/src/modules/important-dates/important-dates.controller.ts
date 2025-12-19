import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ImportantDatesService,
  CreateImportantDateDto,
  UpdateImportantDateDto,
} from './important-dates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('important-dates')
@UseGuards(JwtAuthGuard)
export class ImportantDatesController {
  constructor(private readonly importantDatesService: ImportantDatesService) {}

  @Get()
  async getAll() {
    return this.importantDatesService.getAll();
  }

  @Get('upcoming')
  async getUpcoming(@Query('limit') limit?: string) {
    return this.importantDatesService.getUpcoming(limit ? Number(limit) : 5);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.importantDatesService.getById(Number(id));
  }

  @Post()
  async create(@Body() dto: CreateImportantDateDto) {
    return this.importantDatesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateImportantDateDto) {
    return this.importantDatesService.update(Number(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.importantDatesService.delete(Number(id));
  }
}

