import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { GeographyModule } from '../geography/geography.module';
import { PartiesModule } from '../parties/parties.module';

@Module({
  imports: [GeographyModule, PartiesModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
