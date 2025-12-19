import { Module } from '@nestjs/common';
import { ImportantDatesService } from './important-dates.service';
import { ImportantDatesController } from './important-dates.controller';

@Module({
  controllers: [ImportantDatesController],
  providers: [ImportantDatesService],
  exports: [ImportantDatesService],
})
export class ImportantDatesModule {}

