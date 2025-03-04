import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordBaseDto } from 'src/auth/auth.dto';

@Injectable()
export class PasswordService {
  async hashPassword({ password }: PasswordBaseDto): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
