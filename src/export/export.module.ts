import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ResultsModule } from '../results/results.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [ResultsModule, IncidentsModule],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
