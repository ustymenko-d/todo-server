import { Module } from '@nestjs/common';
import { DatabaseModule } from '@src/database/database.module';
import { SocketsModule } from '@src/sockets/sockets.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtStrategy } from '@src/common/jwt.strategy';

@Module({
  imports: [DatabaseModule, SocketsModule],
  controllers: [TasksController],
  providers: [TasksService, JwtStrategy],
})
export class TasksModule {}
