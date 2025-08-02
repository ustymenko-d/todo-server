import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  providers: [CleanupService],
})
export class CleanupModule {}
