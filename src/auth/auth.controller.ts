import { Controller, Post, Body, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrationDto, AuthDto } from './auth.dto';
import { Response } from 'express';
import { TokenService } from '../token/token.service';
import { MessageClient } from 'src/type/type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}
  @Post('register')
  async register(
    @Body() registrationDto: RegistrationDto,
  ): Promise<MessageClient> {
    console.log(5);
    const { name, email, password } = registrationDto;
    await this.authService.registration(name, email, password);
    return { message: { success: true } };
  }

  @Post('signIn')
  async signIn(
    @Body() authDto: AuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageClient> {
    const { email, password } = authDto;
    console.log(5);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const login = await this.authService.login(email, password);
    const tokens = this.tokenService.createTokens(email);
    this.tokenService.setAuthorization(response, tokens.accessToken);
    this.authService.setCreateCookie(response, tokens.refreshToken);
    return { message: { success: true } };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    this.authService.clearCookie(response);
    return { message: { success: true } };
  }
}
