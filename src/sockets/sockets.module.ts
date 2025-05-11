import { Module } from '@nestjs/common';
import { TasksGateway } from './tasks.gateway';
import { FoldersGateway } from './folders.gateway';
import { ConnectionGateway } from './connection.gateway';

@Module({
  providers: [TasksGateway, FoldersGateway, ConnectionGateway],
  exports: [TasksGateway, FoldersGateway],
})
export class SocketsModule {}
