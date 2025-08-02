import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth.module';
import { TokensModule } from '../tokens/tokens.module';
import { DatabaseModule } from 'src/database/database.module';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [forwardRef(() => AuthModule), TokensModule, DatabaseModule],
  controllers: [PasswordController],
  providers: [PasswordService, MailService],
  exports: [PasswordService],
})
export class PasswordModule {}
