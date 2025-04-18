/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class AuthDto {
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password must not be empty' })
  password: string;
}

export class RegistrationDto extends AuthDto {
  @IsString()
  @IsNotEmpty({ message: 'Name must not be empty' })
  name: string;
}
