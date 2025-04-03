import { forwardRef, Module } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TokensController } from './tokens.controller';
import { AuthModule } from '../auth.module';
import { CookiesModule } from '../cookies/cookies.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default_secret'),
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    forwardRef(() => AuthModule),
    CookiesModule,
  ],
  controllers: [TokensController],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
