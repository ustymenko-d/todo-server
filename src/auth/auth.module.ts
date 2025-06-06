import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PasswordModule } from './password/password.module';
import { CookiesModule } from './cookies/cookies.module';
import { TokensModule } from './tokens/tokens.module';
import { SocketsModule } from 'src/sockets/sockets.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { MailService } from './mail/mail.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => PasswordModule),
    CookiesModule,
    TokensModule,
    SocketsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService],
  exports: [AuthService],
})
export class AuthModule {}
