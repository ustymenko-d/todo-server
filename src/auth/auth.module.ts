import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtStrategy } from '../common/jwt.strategy';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [CommonModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy],
})
export class AuthModule {}
