import { Module } from '@nestjs/common';
import { CookiesService } from './services/cookies.service';
import { MailService } from './services/mail.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RequestHandlerService } from './services/request-handler.service';
import { CleanupService } from './services/cleanup.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}.local`, '.env.local', '.env'],
    }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default_secret'),
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    TokenService,
    CookiesService,
    MailService,
    PasswordService,
    RequestHandlerService,
    CleanupService,
  ],
  exports: [
    TokenService,
    CookiesService,
    MailService,
    PasswordService,
    RequestHandlerService,
  ],
})
export class CommonModule {}
