import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

class PasswordBaseDto {
  @IsString()
  @MinLength(8, { message: 'The password must be at least 8 characters long.' })
  @MaxLength(64, { message: 'The password must not exceed 64 characters.' })
  @Matches(/(?=.*[A-Z])/, {
    message: 'The password must contain at least one capital letter.',
  })
  @Matches(/(?=.*[a-z])/, {
    message: 'The password must contain at least one lowercase letter.',
  })
  @Matches(/(?=.*\d)/, {
    message: 'The password must contain at least one digit.',
  })
  password: string;
}

export class AuthBaseDto extends PasswordBaseDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}

export class RefreshTokenDto {
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty({ message: 'User ID is required.' })
  userId: string;

  @IsString()
  token: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  expiresAt: Date;

  @IsBoolean()
  revoked: boolean;
}

export class JwtUserDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required.' })
  userId: string;

  @IsNumber()
  tokenVersion: number;
}

export class AccessTokenDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

export class TokenPairDto extends AccessTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UserDto extends PasswordBaseDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required.' })
  id: string;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsNumber()
  tokenVersion: number;
}

export class ResponseStatusDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
