import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from './user.model';

@Module({
  providers: [UserService],
  imports: [MongooseModule.forFeature([{ name: 'User', schema: userSchema }])],
  exports: [UserService],
})
export class UserModule {}
