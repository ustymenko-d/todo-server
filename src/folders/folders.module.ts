import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SocketsModule } from 'src/sockets/sockets.module';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { JwtStrategy } from 'src/common/jwt.strategy';

@Module({
  imports: [DatabaseModule, SocketsModule],
  controllers: [FoldersController],
  providers: [FoldersService, JwtStrategy],
})
export class FoldersModule {}
