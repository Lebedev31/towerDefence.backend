import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { AvtorizationGuard } from './guard/avtorization.guard';

@Module({
  providers: [TokenService, AvtorizationGuard],
  exports: [TokenService, AvtorizationGuard],
})
export class TokenModule {}
