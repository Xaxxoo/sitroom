import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EXECUTIVE, Role.STATE_COORDINATOR)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('results')
  async exportResults(
    @Res() res: Response,
    @Query('lgaId') lgaId?: string,
    @Query('wardId') wardId?: string,
  ) {
    const buffer = await this.exportService.exportResultsToExcel({ lgaId, wardId });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="results-${Date.now()}.xlsx"`);
    res.send(buffer);
  }

  @Get('incidents')
  async exportIncidents(
    @Res() res: Response,
    @Query('lgaId') lgaId?: string,
    @Query('wardId') wardId?: string,
  ) {
    const buffer = await this.exportService.exportIncidentsToExcel({ lgaId, wardId });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="incidents-${Date.now()}.xlsx"`);
    res.send(buffer);
  }

  @Get('summary')
  async exportSummary(@Res() res: Response) {
    const buffer = await this.exportService.exportStateSummaryToExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="state-summary-${Date.now()}.xlsx"`);
    res.send(buffer);
  }
}
