import {
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PasswordBaseDto {
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

export class EmailBaseDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;
}

export class AuthDto extends PasswordBaseDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;

  @IsBoolean()
  rememberMe: boolean;
}
