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
import { AuthBaseDto, JwtUserDto, UpdateTokensDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: AuthBaseDto) {
    try {
      const { email, password } = body;
      return this.authService.register(email, password);
    } catch {
      throw new UnauthorizedException('Registration failed');
    }
  }

  @Post('login')
  login(@Body() body: AuthBaseDto) {
    try {
      const { email, password } = body;
      return this.authService.login(email, password);
    } catch {
      throw new UnauthorizedException('Log in failed');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Req() req: { user: JwtUserDto }) {
    const { userId } = req.user;
    this.validateUser(userId);

    try {
      return await this.authService.logout(userId);
    } catch {
      throw new UnauthorizedException('Log out failed');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete')
  async deleteUser(@Req() req: { user: JwtUserDto }) {
    const { userId, tokenVersion } = req.user;

    this.validateUser(userId);
    this.validateTokenVersion(tokenVersion);

    try {
      return await this.authService.deleteUser(userId, tokenVersion);
    } catch {
      throw new UnauthorizedException('User deletion failed');
    }
  }

  @Post('refresh')
  async refresh(@Body() body: UpdateTokensDto) {
    const { userId, refreshToken } = body;

    try {
      const tokens = await this.authService.refreshToken(userId, refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private validateUser(userId: string) {
    if (!userId) {
      this.logger.error('Invalid user ID');
      throw new UnauthorizedException('Invalid user ID');
    }
  }

  private validateTokenVersion(tokenVersion: number) {
    if (tokenVersion === undefined) {
      this.logger.error('Invalid token version');
      throw new UnauthorizedException('Invalid token version');
    }
  }
}
