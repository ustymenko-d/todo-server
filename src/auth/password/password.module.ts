import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth.module';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { TokensModule } from '../tokens/tokens.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [forwardRef(() => AuthModule), TokensModule, PrismaModule],
  controllers: [PasswordController],
  providers: [PasswordService, MailService],
  exports: [PasswordService],
})
export class PasswordModule {}
