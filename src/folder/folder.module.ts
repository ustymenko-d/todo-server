import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [FolderController],
  providers: [FolderService, JwtStrategy],
})
export class FolderModule {}
