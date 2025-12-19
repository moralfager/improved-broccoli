import { Module } from '@nestjs/common';
import { SurprisesService } from './surprises.service';
import { SurprisesController } from './surprises.controller';

@Module({
  controllers: [SurprisesController],
  providers: [SurprisesService],
  exports: [SurprisesService],
})
export class SurprisesModule {}

