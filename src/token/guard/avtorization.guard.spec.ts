/* eslint-disable @typescript-eslint/unbound-method */
import { TokenService } from '../token.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AvtorizationGuard } from './avtorization.guard';
import { TokenExpiredError } from '@nestjs/jwt';
describe('Тесты AvtorizationGuard', () => {
  let guard: AvtorizationGuard;
  let tokenService: TokenService;
  const mockTokenService = {
    verifyToken: jest.fn(),
    createAccessToken: jest.fn(),
    setAuthorization: jest.fn(),
  };

  // Базовые моки для запроса и ответа
  const mockRequest = {
    headers: { authorization: 'Bearer valid_token' },
    cookies: { token: 'valid_refresh_token' },
  };

  const mockResponse = {
    set: jest.fn(),
  };

  const createMockExecutionContext = () => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvtorizationGuard,
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    guard = module.get<AvtorizationGuard>(AvtorizationGuard);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Проверка с валидным acsess токеном', () => {
    mockTokenService.verifyToken.mockReturnValueOnce({
      email: 'test1gmail.com',
    });
    const executionMock = createMockExecutionContext();
    const result = guard.canActivate(executionMock);
    expect(result).toBe(true);
    expect(tokenService.verifyToken).toHaveBeenCalledWith('valid_token', false);
    expect(mockTokenService.verifyToken).toHaveBeenCalledTimes(1);
    // Убедимся, что методы для рефреша не вызывались
    expect(tokenService.createAccessToken).not.toHaveBeenCalled();
    expect(tokenService.setAuthorization).not.toHaveBeenCalled();
  });

  it('проверка с отклоненным acsess - TokenExpired токеном', () => {
    mockTokenService.verifyToken.mockImplementationOnce(() => {
      throw new TokenExpiredError('fhfhfh', new Date());
    });

    mockTokenService.verifyToken.mockReturnValueOnce({
      email: 'testgmail.com',
    });

    mockTokenService.createAccessToken.mockReturnValueOnce('test1gmail.com');
    const executionMock = createMockExecutionContext();
    const result = guard.canActivate(executionMock);
    expect(result).toBe(true);
  });
});
