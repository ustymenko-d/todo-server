import { Module } from '@nestjs/common';
import { CookieService } from './cookie.service';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '3h' },
    }),
    PrismaModule,
  ],
  providers: [TokenService, CookieService, MailService, PasswordService],
  exports: [TokenService, CookieService, MailService, PasswordService],
})
export class CommonModule {}
