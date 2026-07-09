import { Controller, Post, Get, Body, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { BootstrapDto } from './dto/bootstrap.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('bootstrap')
  @ApiOperation({ summary: 'Create the first admin user — disabled once any user exists' })
  bootstrap(@Body() dto: BootstrapDto) {
    return this.adminService.bootstrapAdmin(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('import/geography')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  importGeography(@UploadedFile() file: Express.Multer.File) {
    return this.adminService.importGeographyFromCsv(file.buffer);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('seed/parties')
  seedParties() {
    return this.adminService.seedDefaultParties();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('seed/demo')
  @ApiOperation({ summary: 'Seed realistic demo data — 3 LGAs, 9 wards, 27 PUs, 20 results, 6 incidents' })
  seedDemo() {
    return this.adminService.seedDemoData();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }
}
