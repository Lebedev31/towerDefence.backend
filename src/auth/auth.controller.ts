import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegistrationDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() registrationDto: RegistrationDto) {
    const { name, email, password } = registrationDto;
    return this.userService.createUser(name, email, password);
  }
}
