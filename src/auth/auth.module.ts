import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtStrategy } from '../common/jwt.strategy';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '3h' },
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy],
})
export class AuthModule {}
