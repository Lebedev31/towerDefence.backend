import { Controller, Post, Body, Redirect, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegistrationDto, AuthDto } from './auth.dto';
import { Response } from 'express';
import { TokenService } from '../token/token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}
  @Post('register')
  @Redirect('login')
  async register(@Body() registrationDto: RegistrationDto): Promise<void> {
    const { name, email, password } = registrationDto;
    await this.authService.registration(name, email, password);
  }

  @Post('signIn')
  async signIn(
    @Body() authDto: AuthDto,
    @Res() response: Response,
  ): Promise<void> {
    const { email, password } = authDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const login = await this.authService.login(email, password);
    const tokens = this.tokenService.createTokens(email);
    this.tokenService.setAuthorization(response, tokens.accessToken);
    this.authService.setCreateCookie(response, tokens.refreshToken);
    response.status(301).redirect('/menu');
  }
}
