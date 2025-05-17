import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [CleanupService],
})
export class CleanupModule {}
