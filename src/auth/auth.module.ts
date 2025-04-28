import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PasswordModule } from './password/password.module';
import { CookiesModule } from './cookies/cookies.module';
import { TokensModule } from './tokens/tokens.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { FoldersService } from 'src/folders/folders.service';
import { MailService } from './mail/mail.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => PasswordModule),
    CookiesModule,
    TokensModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService, FoldersService],
  exports: [AuthService],
})
export class AuthModule {}
