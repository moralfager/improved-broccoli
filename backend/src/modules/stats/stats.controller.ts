import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('export/json')
  async exportJSON(@Res() res: Response) {
    const data = await this.statsService.exportTimeline();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="timeline-export.json"');
    res.json(data);
  }

  @Get('export/csv')
  async exportCSV(@Res() res: Response) {
    const csv = await this.statsService.exportTimelineCSV();
    // Add UTF-8 BOM for proper Cyrillic support in Excel
    const BOM = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="timeline-export.csv"');
    res.send(BOM + csv);
  }
}

