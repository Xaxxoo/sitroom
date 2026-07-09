import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GeographyService } from './geography.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('geography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get('lgas')
  getLgas(@Query() pagination: PaginationDto) {
    return this.geographyService.getLgas(pagination.page, pagination.limit);
  }

  @Get('lgas/:id')
  getLga(@Param('id') id: string) {
    return this.geographyService.getLga(id);
  }

  @Get('wards')
  @ApiQuery({ name: 'lgaId', required: false })
  getWards(@Query('lgaId') lgaId?: string, @Query() pagination: PaginationDto = new PaginationDto()) {
    return this.geographyService.getWards(lgaId, pagination.page, pagination.limit);
  }

  @Get('wards/:id')
  getWard(@Param('id') id: string) {
    return this.geographyService.getWard(id);
  }

  @Get('polling-units')
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'lgaId', required: false })
  getPollingUnits(
    @Query('wardId') wardId?: string,
    @Query('lgaId') lgaId?: string,
    @Query() pagination: PaginationDto = new PaginationDto(),
  ) {
    return this.geographyService.getPollingUnits(wardId, lgaId, pagination.page, pagination.limit);
  }

  @Get('polling-units/:id')
  getPollingUnit(@Param('id') id: string) {
    return this.geographyService.getPollingUnit(id);
  }

  @Get('stats')
  getStats() {
    return this.geographyService.getStats();
  }
}
