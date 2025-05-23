import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { FoldersModule } from './folders/folders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}.local`, '.env.local', '.env'],
    }),
    PrismaModule,
    CleanupModule,
    AuthModule,
    TasksModule,
    FoldersModule,
  ],
})
export class AppModule {}
