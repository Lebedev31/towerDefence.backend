import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/type/type';
import { Response } from 'express';

type AuthToken = {
  accessToken: string;
  refreshToken: string;
};

export type JwtPayload = {
  email: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig>,
  ) {}

  private generateToken(
    payload: string,
    exp: string,
    toggleSecretEnv: boolean,
  ): string {
    const pay = { payload };
    if (toggleSecretEnv) {
      return this.jwtService.sign(pay, {
        expiresIn: exp,
        secret: this.getEnvRefreshSecret(),
      });
    }
    return this.jwtService.sign(pay, { expiresIn: exp });
  }

  private getEnvRefreshSecret() {
    return this.configService.get<string>('JWT_SECRET_REFRESH');
  }

  createTokens(payload: string): AuthToken {
    return {
      accessToken: this.generateToken(payload, '15m', false),
      refreshToken: this.generateToken(payload, '7d', true),
    };
  }
  createAccessToken(payload: string): string {
    return this.generateToken(payload, '15m', false);
  }

  createRefreshToken(payload: string): string {
    return this.generateToken(payload, '7d', true);
  }

  verifyToken(token: string, toggleSecretEnv: boolean): JwtPayload {
    if (toggleSecretEnv) {
      return this.jwtService.verify(token, {
        secret: this.getEnvRefreshSecret(),
      });
    }
    return this.jwtService.verify<JwtPayload>(token);
  }

  setAuthorization(response: Response, accessToken: string): void {
    response.set('Authorization', `Bearer ${accessToken}`);
  }
}
