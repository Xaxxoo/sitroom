import { Controller, Get, Param, Query, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STATE_COORDINATOR, Role.LGA_COORDINATOR)
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'lgaId', required: false })
  @ApiQuery({ name: 'wardId', required: false })
  findAll(
    @Query('role') role?: string,
    @Query('lgaId') lgaId?: string,
    @Query('wardId') wardId?: string,
  ) {
    return this.usersService.findAll({ role, lgaId, wardId });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STATE_COORDINATOR)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
