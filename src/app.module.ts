import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { FolderModule } from './folder/folder.module';

@Module({
  imports: [PrismaModule, AuthModule, TasksModule, FolderModule],
})
export class AppModule {}
