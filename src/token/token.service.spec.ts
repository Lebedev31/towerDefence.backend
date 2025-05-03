/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './token.service';
import { Response } from 'express';

const email = 'test1@gmail.com';

describe('Проверка TokenService', () => {
  let service: TokenService;
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET_REFRESH') {
        return 'secret';
      } else {
        return undefined;
      }
    }),
  };

  const mockResponse = {
    set: jest.fn(),
  } as unknown as Response;

  const mockJwtService = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sign: jest.fn((payload: { email: string }) => {
      return `token ${email}`;
    }),

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    verify: jest.fn((token: string): JwtPayload => {
      return { email };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Проверка существования сервиса', () => {
    expect(service).toBeDefined();
  });

  it('Проверка экземпляра класса', () => {
    expect(service).toBeInstanceOf(TokenService);
  });

  it('Проверка метода createTokens', () => {
    const createTokens = service.createTokens(email);

    expect(mockConfigService.get).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET_REFRESH');
    expect(mockConfigService.get('JWT_SECRET_REFRESH')).toEqual('secret');

    expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      { payload: email },
      { expiresIn: '15m' },
    );

    expect(mockJwtService.sign).toHaveBeenCalledWith(
      { payload: email },
      { expiresIn: '7d', secret: 'secret' },
    );

    expect(createTokens).not.toBe(undefined);
    expect(createTokens).toEqual({
      accessToken: `token ${email}`,
      refreshToken: `token ${email}`,
    });
  });

  it('проверка метода createAccessToken', () => {
    const createAccessToken = service.createAccessToken(email);

    expect(mockConfigService.get).not.toHaveBeenCalled();
    expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
    expect(createAccessToken).toEqual(`token ${email}`);
  });

  it('проверка метода createRefreshToken', () => {
    const createRefreshToken = service.createRefreshToken(email);

    expect(mockConfigService.get).toHaveBeenCalled();
    expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
    expect(createRefreshToken).toEqual(`token ${email}`);
  });

  it('Проверка метода verifyToken', () => {
    const verifyToken = service.verifyToken(email, true);

    expect(mockConfigService.get).toHaveBeenCalled();
    expect(mockJwtService.verify).toHaveBeenCalled();
    expect(verifyToken).not.toBe(undefined);
    expect(verifyToken).toEqual({ email });
  });

  it('Проверка метода setAuthorization', () => {
    service.setAuthorization(mockResponse, 'testToken');

    // Проверяем, что внутри метода была вызвана функция set на mockResponse
    expect(mockResponse.set).toHaveBeenCalledWith(
      'Authorization',
      'Bearer testToken',
    );
  });
});
