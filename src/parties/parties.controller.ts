import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PartiesService } from './parties.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.partiesService.findAll(all !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partiesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() data: Partial<any>) {
    return this.partiesService.create(data);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: Partial<any>) {
    return this.partiesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.partiesService.remove(id);
  }
}
