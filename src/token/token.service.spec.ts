import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './token.service';

const email = 'test1@gmail.com';

describe('Проверка TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET_REFRESH') {
        return 'secret';
      } else {
        return undefined;
      }
    }),
  };

  const mockJwtService = {
    sign: jest.fn((payload: JwtPayload) => {
      return `token ${payload.email}`;
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
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
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
    mockConfigService.get.mockReturnValue('secret');
    mockJwtService.sign.mockReturnValue('token');
    const createTokens = service.createTokens(email);

    expect(createTokens).toHaveBeenCalledTimes(1);
    expect(configService).toHaveBeenCalledTimes(1);
    expect(jwtService).toHaveBeenCalledTimes(1);
  });
});
