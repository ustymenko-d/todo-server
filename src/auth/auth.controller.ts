import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest, RefreshRequest } from './auth.interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthService.name);

  @Post('register')
  register(@Body() body: AuthRequest) {
    try {
      const { email, password } = body;
      return this.authService.register(email, password);
    } catch {
      throw new UnauthorizedException('Registration failed');
    }
  }

  @Post('login')
  login(@Body() body: AuthRequest) {
    try {
      const { email, password } = body;
      return this.authService.login(email, password);
    } catch {
      throw new UnauthorizedException('Login failed');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete')
  async deleteUser(@Req() req) {
    const { userId, tokenVersion } = req.user;
    this.validateUser(userId, tokenVersion);

    try {
      return await this.authService.deleteUser(userId, tokenVersion);
    } catch {
      throw new UnauthorizedException('User deletion failed');
    }
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshRequest) {
    const { userId, refreshToken } = body;

    try {
      const tokens = await this.authService.refreshToken(userId, refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private validateUser(userId: string, tokenVersion: number) {
    if (!userId || tokenVersion === undefined) {
      this.logger.error('Invalid user ID or token version');
      throw new UnauthorizedException('Invalid user ID or token version');
    }
  }
}
