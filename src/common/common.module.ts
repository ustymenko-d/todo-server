import { Module } from '@nestjs/common';
import { CookieService } from './cookie.service';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RequestHandlerService } from './request-handler.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule,
  ],
  providers: [
    TokenService,
    CookieService,
    MailService,
    PasswordService,
    RequestHandlerService,
  ],
  exports: [
    TokenService,
    CookieService,
    MailService,
    PasswordService,
    RequestHandlerService,
  ],
})
export class CommonModule {}
