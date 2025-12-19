import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MusicService, CreateMusicTrackDto } from './music.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('music')
@UseGuards(JwtAuthGuard)
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Post()
  async create(@Body() dto: CreateMusicTrackDto) {
    return this.musicService.create(dto);
  }

  @Get('playlist')
  async getPlaylist() {
    return this.musicService.getPlaylist();
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.musicService.delete(Number(id));
  }
}

