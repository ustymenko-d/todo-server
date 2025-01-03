import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete')
  deleteUser(@Req() req) {
    console.log('User from JWT:', req.user);
    const { userId } = req.user;
    if (!userId) {
      throw new UnauthorizedException('Invalid user ID');
    }
    return this.authService.deleteUser(req.user.userId);
  }
}
