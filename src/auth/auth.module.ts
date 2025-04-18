import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from '../user/user.model';

@Module({
  providers: [AuthService],
  controllers: [AuthController],
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: 'User', schema: userSchema }]),
  ],
})
export class AuthModule {}
