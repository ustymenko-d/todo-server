import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { FolderModule } from './folder/folder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}.local`, '.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    TasksModule,
    FolderModule,
  ],
})
export class AppModule {}
