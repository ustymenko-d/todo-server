import { forwardRef, Module } from '@nestjs/common';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from '../auth.module';

@Module({
  imports: [CommonModule, forwardRef(() => AuthModule)],
  controllers: [PasswordController],
  providers: [PasswordService],
  exports: [PasswordService],
})
export class PasswordModule {}
