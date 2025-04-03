import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtStrategy } from '../common/jwt.strategy';
import { CommonModule } from 'src/common/common.module';
import { PasswordModule } from './password/password.module';
import { CookiesModule } from './cookies/cookies.module';
import { MailModule } from './mail/mail.module';
import { TokensModule } from './tokens/tokens.module';

@Module({
  imports: [
    CommonModule,
    PrismaModule,
    forwardRef(() => PasswordModule),
    CookiesModule,
    MailModule,
    TokensModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
