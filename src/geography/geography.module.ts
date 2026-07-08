import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeographyService } from './geography.service';
import { GeographyController } from './geography.controller';
import { Lga } from './entities/lga.entity';
import { Ward } from './entities/ward.entity';
import { PollingUnit } from './entities/polling-unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lga, Ward, PollingUnit])],
  providers: [GeographyService],
  controllers: [GeographyController],
  exports: [GeographyService],
})
export class GeographyModule {}
