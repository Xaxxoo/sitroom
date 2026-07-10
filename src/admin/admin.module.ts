import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { GeographyModule } from '../geography/geography.module';
import { PartiesModule } from '../parties/parties.module';
import { UsersModule } from '../users/users.module';
import { ResultsModule } from '../results/results.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [GeographyModule, PartiesModule, UsersModule, ResultsModule, IncidentsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
