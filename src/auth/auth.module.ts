import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PasswordModule } from './password/password.module';
import { CookiesModule } from './cookies/cookies.module';
import { MailModule } from './mail/mail.module';
import { TokensModule } from './tokens/tokens.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { FoldersService } from 'src/folders/folders.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => PasswordModule),
    CookiesModule,
    MailModule,
    TokensModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, FoldersService],
  exports: [AuthService],
})
export class AuthModule {}
