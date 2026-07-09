import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SanitizeString } from '../../common/transforms/sanitize.transform';

export class ResolveIncidentDto {
  @ApiProperty({ description: 'Resolution note explaining how the incident was handled' })
  @SanitizeString()
  @IsString()
  @IsNotEmpty()
  note: string;
}
