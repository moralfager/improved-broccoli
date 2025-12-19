import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CalendarService, CreateDayDto, CreateItemDto } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getDays(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // If dates provided, use date range filtering
    if (startDate && endDate) {
      return this.calendarService.getDaysByDateRange(startDate, endDate);
    }
    // Otherwise use pagination
    return this.calendarService.getDays(Number(page || 1), Number(limit || 20));
  }

  @Post()
  async createOrUpdateDay(@Body() dto: CreateDayDto) {
    return this.calendarService.createOrUpdateDay(dto);
  }

  @Post(':date/items')
  async addItem(@Param('date') date: string, @Body() dto: CreateItemDto) {
    return this.calendarService.addItem(date, dto);
  }

  @Delete(':date')
  async deleteDay(@Param('date') date: string) {
    console.log('DELETE /calendar/:date called with date:', date);
    return this.calendarService.deleteDay(date);
  }

  @Get(':date')
  async getDay(@Param('date') date: string) {
    return this.calendarService.getDay(date);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.calendarService.deleteItem(Number(id));
  }
}

