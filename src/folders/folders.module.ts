import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SocketsModule } from 'src/sockets/sockets.module';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { JwtStrategy } from 'src/common/jwt.strategy';

@Module({
  imports: [PrismaModule, SocketsModule],
  controllers: [FoldersController],
  providers: [FoldersService, JwtStrategy],
})
export class FoldersModule {}
