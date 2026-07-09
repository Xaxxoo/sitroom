import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.incidentsService.create(dto, user);
  }

  @Get()
  @ApiQuery({ name: 'lgaId', required: false })
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('lgaId') lgaId?: string,
    @Query('wardId') wardId?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query() pagination: PaginationDto = new PaginationDto(),
  ) {
    return this.incidentsService.findAll({ lgaId, wardId, severity, status }, pagination.page, pagination.limit);
  }

  @Get('stats')
  getStats() {
    return this.incidentsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id/escalate')
  @Roles(Role.WARD_COORDINATOR, Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN)
  escalate(@Param('id') id: string) {
    return this.incidentsService.escalate(id);
  }

  @Patch(':id/resolve')
  @Roles(Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN)
  resolve(@Param('id') id: string, @Body('note') note: string, @CurrentUser() user: any) {
    return this.incidentsService.resolve(id, user, note);
  }
}
