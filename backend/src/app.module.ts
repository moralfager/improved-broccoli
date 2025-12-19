import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { MediaModule } from './modules/media/media.module';
import { PeriodsModule } from './modules/periods/periods.module';
import { PlansModule } from './modules/plans/plans.module';
import { ImportantDatesModule } from './modules/important-dates/important-dates.module';
import { LettersModule } from './modules/letters/letters.module';
import { MusicModule } from './modules/music/music.module';
import { SurprisesModule } from './modules/surprises/surprises.module';
import { HabitsModule } from './modules/habits/habits.module';
import { StatsModule } from './modules/stats/stats.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    CalendarModule,
    MediaModule,
    PeriodsModule,
    PlansModule,
    ImportantDatesModule,
    LettersModule,
    MusicModule,
    SurprisesModule,
    HabitsModule,
    StatsModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

