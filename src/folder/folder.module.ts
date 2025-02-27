import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [FolderController],
  providers: [FolderService, PrismaService],
})
export class FolderModule {}
