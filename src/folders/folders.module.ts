import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [FoldersController],
  providers: [FoldersService, JwtStrategy],
})
export class FoldersModule {}
