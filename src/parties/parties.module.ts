import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { Party } from './entities/party.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Party])],
  providers: [PartiesService],
  controllers: [PartiesController],
  exports: [PartiesService],
})
export class PartiesModule {}
