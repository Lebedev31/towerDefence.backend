import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AuthDto {
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email' })
  @MinLength(3, {
    message: 'Имя должно содержать минимум 3 символа',
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password must not be empty' })
  @MinLength(3, {
    message: 'Имя должно содержать минимум 3 символа',
  })
  password: string;
}

export class RegistrationDto extends AuthDto {
  @IsString()
  @IsNotEmpty({ message: 'Name must not be empty' })
  @MinLength(3, {
    message: 'Имя должно содержать минимум 3 символа',
  })
  name: string;
}
