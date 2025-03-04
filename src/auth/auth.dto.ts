import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

class PasswordBase {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters.' })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one capital letter.',
  })
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter.',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one digit.',
  })
  password: string;
}

class EmailBase {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}

export class PasswordBaseDto extends PasswordBase {}
export class EmailBaseDto extends EmailBase {}

export class AuthBaseDto extends PasswordBase {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}

export class RefreshTokenPayloadDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  refreshToken: string;
}

export class UserDto extends PasswordBaseDto {
  @IsUUID()
  id: string;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsNumber()
  tokenVersion: number;

  @IsBoolean()
  isVerified: boolean;

  @IsString()
  @IsOptional()
  verificationToken: string | null;

  @IsDate()
  createdAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
