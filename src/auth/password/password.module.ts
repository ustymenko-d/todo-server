import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth.module';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { TokensModule } from '../tokens/tokens.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TokensModule,
    MailModule,
    PrismaModule,
  ],
  controllers: [PasswordController],
  providers: [PasswordService],
  exports: [PasswordService],
})
export class PasswordModule {}
