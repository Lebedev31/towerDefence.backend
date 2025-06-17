import { IsString, IsNotEmpty } from 'class-validator';

export class FriendsIdDto {
  @IsString({ message: 'Id должен быть строкой' })
  @IsNotEmpty({ message: 'Нельзя передавать пустые данные' })
  id: string;
}
