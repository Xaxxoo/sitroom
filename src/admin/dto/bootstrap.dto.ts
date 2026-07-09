import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SanitizeString } from '../../common/transforms/sanitize.transform';

export class BootstrapDto {
  @ApiProperty({ example: '08012345678' })
  @SanitizeString()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @SanitizeString()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
