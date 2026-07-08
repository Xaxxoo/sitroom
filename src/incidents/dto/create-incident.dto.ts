import { IsEnum, IsString, IsOptional, IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IncidentType, IncidentSeverity } from '../../common/enums/incident-type.enum';

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  pollingUnitId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  wardId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  lgaId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  mediaUrls?: string[];
}
