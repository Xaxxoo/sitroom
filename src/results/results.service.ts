import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Result, ResultStatus } from './entities/result.entity';
import { PartyScore } from './entities/party-score.entity';
import { PollingUnit } from '../geography/entities/polling-unit.entity';
import { User } from '../users/entities/user.entity';
import { SubmitResultDto } from './dto/submit-result.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Role } from '../common/enums/role.enum';
import { paginated } from '../common/dto/pagination.dto';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result) private resultRepo: Repository<Result>,
    @InjectRepository(PartyScore) private scoreRepo: Repository<PartyScore>,
    @InjectRepository(PollingUnit) private puRepo: Repository<PollingUnit>,
    private dataSource: DataSource,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async submit(dto: SubmitResultDto, submittedBy: User) {
    const pu = await this.puRepo.findOne({
      where: { id: dto.pollingUnitId },
      relations: ['result', 'ward', 'ward.lga'],
    });
    if (!pu) throw new NotFoundException('Polling unit not found');

    if (submittedBy.role === Role.AGENT) {
      if (!submittedBy.pollingUnit || submittedBy.pollingUnit.id !== pu.id) {
        throw new ForbiddenException('You can only submit results for your assigned polling unit');
      }
    }

    if (pu.result) throw new ConflictException('Result already submitted for this polling unit. Use update endpoint.');

    const anomalyReasons: string[] = [];
    let isAnomalous = false;

    if (pu.registeredVoters && dto.accreditedVoters > pu.registeredVoters) {
      anomalyReasons.push('Accredited voters exceed registered voters');
      isAnomalous = true;
    }
    if (dto.totalVotesCast > dto.accreditedVoters) {
      anomalyReasons.push('Total votes cast exceed accredited voters');
      isAnomalous = true;
    }
    if (dto.totalValidVotes + dto.rejectedBallots !== dto.totalVotesCast) {
      anomalyReasons.push('Valid votes + rejected ballots do not equal total votes cast');
      isAnomalous = true;
    }
    const totalPartyVotes = dto.partyScores.reduce((sum, s) => sum + s.votes, 0);
    if (totalPartyVotes !== dto.totalValidVotes) {
      anomalyReasons.push('Sum of party votes does not match total valid votes');
      isAnomalous = true;
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const newResult = manager.create(Result, {
        pollingUnit: pu,
        pollingUnitId: pu.id,
        submittedBy,
        accreditedVoters: dto.accreditedVoters,
        totalVotesCast: dto.totalVotesCast,
        rejectedBallots: dto.rejectedBallots,
        totalValidVotes: dto.totalValidVotes,
        iNecFormImageUrl: dto.iNecFormImageUrl,
        isAnomalous,
        anomalyReasons,
        status: ResultStatus.SUBMITTED,
      });
      await manager.save(newResult);

      const scores = dto.partyScores.map((s) =>
        manager.create(PartyScore, {
          result: newResult,
          party: { id: s.partyId },
          votes: s.votes,
        }),
      );
      await manager.save(scores);

      return manager.findOne(Result, {
        where: { id: newResult.id },
        relations: ['pollingUnit', 'pollingUnit.ward', 'pollingUnit.ward.lga', 'submittedBy', 'partyScores', 'partyScores.party'],
      });
    });

    this.realtimeGateway.emitResultSubmitted(result);
    if (isAnomalous) this.realtimeGateway.emitAnomaly(result);

    return result;
  }

  async findAll(filters?: { lgaId?: string; wardId?: string; isAnomalous?: boolean }, page = 1, limit = 20) {
    const qb = this.resultRepo.createQueryBuilder('result')
      .leftJoinAndSelect('result.pollingUnit', 'pu')
      .leftJoinAndSelect('pu.ward', 'ward')
      .leftJoinAndSelect('ward.lga', 'lga')
      .leftJoinAndSelect('result.partyScores', 'scores')
      .leftJoinAndSelect('scores.party', 'party')
      .leftJoinAndSelect('result.submittedBy', 'submittedBy')
      .orderBy('result.createdAt', 'DESC');

    if (filters?.lgaId) qb.andWhere('lga.id = :lgaId', { lgaId: filters.lgaId });
    if (filters?.wardId) qb.andWhere('ward.id = :wardId', { wardId: filters.wardId });
    if (filters?.isAnomalous !== undefined) qb.andWhere('result.isAnomalous = :isAnomalous', { isAnomalous: filters.isAnomalous });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async findOne(id: string) {
    const result = await this.resultRepo.findOne({
      where: { id },
      relations: ['pollingUnit', 'pollingUnit.ward', 'pollingUnit.ward.lga', 'submittedBy', 'partyScores', 'partyScores.party'],
    });
    if (!result) throw new NotFoundException('Result not found');
    return result;
  }

  async getAggregation() {
    const results = await this.resultRepo.find({
      relations: ['pollingUnit', 'pollingUnit.ward', 'pollingUnit.ward.lga', 'partyScores', 'partyScores.party'],
    });

    const partyTotals: Record<string, { name: string; abbreviation: string; color: string; totalVotes: number }> = {};
    let totalAccredited = 0;
    let totalVotesCast = 0;
    let totalRejected = 0;
    const puReporting = results.length;
    const anomalousCount = results.filter((r) => r.isAnomalous).length;

    for (const result of results) {
      totalAccredited += result.accreditedVoters;
      totalVotesCast += result.totalVotesCast;
      totalRejected += result.rejectedBallots;

      for (const score of result.partyScores) {
        if (!partyTotals[score.party.id]) {
          partyTotals[score.party.id] = {
            name: score.party.name,
            abbreviation: score.party.abbreviation,
            color: score.party.color,
            totalVotes: 0,
          };
        }
        partyTotals[score.party.id].totalVotes += score.votes;
      }
    }

    const partySummary = Object.entries(partyTotals)
      .map(([id, data]) => ({ partyId: id, ...data }))
      .sort((a, b) => b.totalVotes - a.totalVotes);

    return {
      puReporting,
      anomalousCount,
      totalAccredited,
      totalVotesCast,
      totalRejected,
      totalValidVotes: totalVotesCast - totalRejected,
      leadingParty: partySummary[0] || null,
      partySummary,
    };
  }

  async getLgaAggregation() {
    const results = await this.resultRepo.find({
      relations: ['pollingUnit', 'pollingUnit.ward', 'pollingUnit.ward.lga', 'partyScores', 'partyScores.party'],
    });

    const lgaMap: Record<string, any> = {};

    for (const result of results) {
      const lga = result.pollingUnit?.ward?.lga;
      if (!lga) continue;

      if (!lgaMap[lga.id]) {
        lgaMap[lga.id] = { lgaId: lga.id, lgaName: lga.name, puReporting: 0, partyTotals: {} };
      }

      lgaMap[lga.id].puReporting += 1;

      for (const score of result.partyScores) {
        if (!lgaMap[lga.id].partyTotals[score.party.abbreviation]) {
          lgaMap[lga.id].partyTotals[score.party.abbreviation] = 0;
        }
        lgaMap[lga.id].partyTotals[score.party.abbreviation] += score.votes;
      }
    }

    return Object.values(lgaMap);
  }

  async verify(id: string) {
    await this.resultRepo.update(id, { status: ResultStatus.VERIFIED });
    return this.findOne(id);
  }

  async flag(id: string, reasons: string[]) {
    await this.resultRepo.update(id, {
      status: ResultStatus.FLAGGED,
      isAnomalous: true,
      anomalyReasons: reasons,
    });
    const result = await this.findOne(id);
    this.realtimeGateway.emitAnomaly(result);
    return result;
  }
}
