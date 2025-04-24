/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../type/type';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'; // Импортируем bcrypt, чтобы замокать его
import { ConflictException } from '@nestjs/common';

jest.mock('bcrypt');
const testName = 'Test User';
const testEmail = 'test@example.com';
const testPassword = 'password123';

describe('UserService test', () => {
  let service: UserService;
  let userModel: Model<User>;
  let mockBcryptHash: jest.Mock;
  // создаем мок модели с методом эксземпляра save
  const mockUserModel = jest.fn().mockImplementation((data: User) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  })) as jest.Mock & Model<User>;
  // добавляем статистические методы
  mockUserModel.findOne = jest
    .fn()
    .mockResolvedValue(null) as Model<User>['findOne'];
  mockUserModel.create = jest.fn().mockImplementation((data: User) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<User>>(getModelToken('User'));
    mockBcryptHash = bcrypt.hash as jest.Mock;
    mockBcryptHash.mockResolvedValue('hashPassword');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Проверка существования сервиса', () => {
    expect(service).toBeDefined();
  });

  it('Проверка экземпляра класса', () => {
    expect(service).toBeInstanceOf(UserService);
  });

  it('Проверка инжектирования модели', () => {
    expect(userModel).toBeDefined();
  });

  it('Проверка создания пользователя с новым емаил', async () => {
    const createdUserPublicData = await service.createUser(
      testName,
      testEmail,
      testPassword,
    );

    // был ли вызван findOne c правильным email
    expect(mockUserModel.findOne).toHaveBeenCalledTimes(1);
    expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: testEmail });
    // что возвращает createUser?
    expect(createdUserPublicData).toEqual({
      email: testEmail,
      name: testName,
    });

    expect(createdUserPublicData).not.toEqual({
      email: 'jfjfj',
      name: undefined,
    });
  });

  it('проверка вызова bcrypt', async () => {
    await service.createUser(testName, testEmail, testPassword);
    expect(mockBcryptHash).toHaveBeenCalledTimes(1);
    expect(mockBcryptHash).toHaveBeenCalledWith(testPassword, 10);

    const hash = await bcrypt.hash(testPassword, 10);
    expect(hash).not.toBe(testPassword);
    expect(typeof hash).toBe('string');
  });

  it('проверка ошибки - такой пользователь существует', async () => {
    (mockUserModel.findOne as jest.Mock).mockResolvedValue({
      email: testEmail,
    });

    await expect(
      service.createUser(testName, testEmail, testPassword),
    ).rejects.toThrow(ConflictException);
    // проверка что bcrypt и модель базы данных вызваны не были
    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockUserModel).not.toHaveBeenCalled();
  });

  it('Проверка, что выбрасывается ошибка при ошибке сохранения в базе', async () => {
    const simulatedDbError = new Error('Случилась ошибка в базе данных');

    mockUserModel.mockImplementationOnce(
      // <--- Правильный синтаксис вызова
      (data: User) => ({
        ...data,
        save: jest.fn().mockRejectedValue(simulatedDbError), // <--- save() отклоняется с ошибкой
      }),
    );

    await expect(
      service.createUser(testName, testEmail, testPassword),
    ).rejects.toThrow(ConflictException);
  });
});
