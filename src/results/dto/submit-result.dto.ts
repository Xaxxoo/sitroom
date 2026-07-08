import { IsUUID, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PartyScoreDto {
  @ApiProperty()
  @IsUUID()
  partyId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  votes: number;
}

export class SubmitResultDto {
  @ApiProperty()
  @IsUUID()
  pollingUnitId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  accreditedVoters: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalVotesCast: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  rejectedBallots: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalValidVotes: number;

  @ApiProperty({ type: [PartyScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyScoreDto)
  partyScores: PartyScoreDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  iNecFormImageUrl?: string;
}
