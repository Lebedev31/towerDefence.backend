import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../type/type';
import { Model } from 'mongoose';

describe('UserService test', () => {
  let service: UserService;
  let userModel: Model<User>;
  let spyCreateUser: jest.SpyInstance;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken('User'),
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<User>>(getModelToken('User'));
    spyCreateUser = jest.spyOn(service, 'createUser');
  });

  afterEach(() => {
    spyCreateUser.mockRestore();
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

  it('Проверка вызывается ли метод createUser с правильными данными', async () => {
    await service.createUser('Lebed', 'test1@gmail.com', '77824877');
    expect(spyCreateUser).toHaveBeenCalledWith(
      'Lebed',
      'test1@gmail.com',
      '77824877',
    );
  });
});
