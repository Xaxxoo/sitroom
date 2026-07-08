import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: '08012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, default: Role.AGENT })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  lgaId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  wardId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  pollingUnitId?: string;
}
