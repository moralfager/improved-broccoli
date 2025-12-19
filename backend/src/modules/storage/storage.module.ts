import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { StorageController } from './storage.controller';
import { DatabaseModule } from '../../database/database.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [DatabaseModule, CalendarModule],
  controllers: [StorageController],
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class StorageModule {}

