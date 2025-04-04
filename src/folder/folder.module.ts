import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FolderController],
  providers: [FolderService],
})
export class FolderModule {}
