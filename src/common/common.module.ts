import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RequestHandlerService } from './services/request-handler.service';
import { CleanupService } from './services/cleanup.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PassportModule, PrismaModule, ScheduleModule.forRoot()],
  providers: [RequestHandlerService, CleanupService],
  exports: [RequestHandlerService],
})
export class CommonModule {}
