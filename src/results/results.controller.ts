import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { SubmitResultDto } from './dto/submit-result.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('submit')
  @Roles(Role.AGENT, Role.WARD_COORDINATOR, Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN)
  submit(@Body() dto: SubmitResultDto, @CurrentUser() user: any) {
    return this.resultsService.submit(dto, user);
  }

  @Get()
  @ApiQuery({ name: 'lgaId', required: false })
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'anomalous', required: false })
  findAll(
    @Query('lgaId') lgaId?: string,
    @Query('wardId') wardId?: string,
    @Query('anomalous') anomalous?: string,
  ) {
    return this.resultsService.findAll({
      lgaId,
      wardId,
      isAnomalous: anomalous === 'true' ? true : undefined,
    });
  }

  @Get('aggregation')
  getAggregation() {
    return this.resultsService.getAggregation();
  }

  @Get('aggregation/lga')
  getLgaAggregation() {
    return this.resultsService.getLgaAggregation();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsService.findOne(id);
  }

  @Patch(':id/verify')
  @Roles(Role.STATE_COORDINATOR, Role.ADMIN)
  verify(@Param('id') id: string) {
    return this.resultsService.verify(id);
  }

  @Patch(':id/flag')
  @Roles(Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN)
  flag(@Param('id') id: string, @Body('reasons') reasons: string[]) {
    return this.resultsService.flag(id, reasons);
  }
}
