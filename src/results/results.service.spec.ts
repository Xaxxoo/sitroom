import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResultsService } from './results.service';
import { Result } from './entities/result.entity';
import { PartyScore } from './entities/party-score.entity';
import { PollingUnit } from '../geography/entities/polling-unit.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SubmitResultDto } from './dto/submit-result.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

describe('ResultsService — anomaly detection', () => {
  let service: ResultsService;
  let puRepo: { findOne: jest.Mock };
  let resultRepo: { findOne: jest.Mock; update: jest.Mock };
  let realtimeGateway: { emitResultSubmitted: jest.Mock; emitAnomaly: jest.Mock };
  let createdResult: any;

  const adminUser = { id: 'user-1', role: Role.ADMIN } as User;

  // A polling unit with no existing result and 1000 registered voters.
  const pollingUnit = {
    id: 'pu-1',
    registeredVoters: 1000,
    result: null,
    ward: { id: 'ward-1', lga: { id: 'lga-1' } },
  };

  // Baseline DTO with no anomalies:
  //   accredited (500) <= registered (1000)
  //   valid (480) + rejected (20) == cast (500)
  //   party votes (300 + 180 = 480) == valid (480)
  const validDto = (): SubmitResultDto => ({
    pollingUnitId: 'pu-1',
    accreditedVoters: 500,
    totalVotesCast: 500,
    rejectedBallots: 20,
    totalValidVotes: 480,
    partyScores: [
      { partyId: 'party-a', votes: 300 },
      { partyId: 'party-b', votes: 180 },
    ],
  });

  beforeEach(async () => {
    createdResult = undefined;

    const manager = {
      create: jest.fn((entity: any, data: any) => {
        if (entity === Result) createdResult = data;
        return data;
      }),
      save: jest.fn(async (x: any) => x),
      findOne: jest.fn(async () => createdResult),
    };

    const dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };

    puRepo = { findOne: jest.fn().mockResolvedValue({ ...pollingUnit }) };
    resultRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue(undefined) };
    realtimeGateway = {
      emitResultSubmitted: jest.fn(),
      emitAnomaly: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: getRepositoryToken(Result), useValue: resultRepo },
        { provide: getRepositoryToken(PartyScore), useValue: {} },
        { provide: getRepositoryToken(PollingUnit), useValue: puRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: RealtimeGateway, useValue: realtimeGateway },
      ],
    }).compile();

    service = module.get<ResultsService>(ResultsService);
  });

  it('flags no anomaly when all totals are consistent', async () => {
    await service.submit(validDto(), adminUser);

    expect(createdResult.isAnomalous).toBe(false);
    expect(createdResult.anomalyReasons).toEqual([]);
    expect(realtimeGateway.emitResultSubmitted).toHaveBeenCalledTimes(1);
    expect(realtimeGateway.emitAnomaly).not.toHaveBeenCalled();
  });

  it('flags anomaly when accredited voters exceed registered voters', async () => {
    const dto = validDto();
    dto.accreditedVoters = 1500; // > 1000 registered

    await service.submit(dto, adminUser);

    expect(createdResult.isAnomalous).toBe(true);
    expect(createdResult.anomalyReasons).toContain('Accredited voters exceed registered voters');
    expect(realtimeGateway.emitAnomaly).toHaveBeenCalledTimes(1);
  });

  it('flags anomaly when total votes cast exceed accredited voters', async () => {
    const dto = validDto();
    dto.accreditedVoters = 400; // cast 500 > accredited 400
    dto.totalVotesCast = 500;

    await service.submit(dto, adminUser);

    expect(createdResult.isAnomalous).toBe(true);
    expect(createdResult.anomalyReasons).toContain('Total votes cast exceed accredited voters');
    expect(realtimeGateway.emitAnomaly).toHaveBeenCalledTimes(1);
  });

  it('does not flag the accredited check when registeredVoters is unknown', async () => {
    puRepo.findOne.mockResolvedValue({ ...pollingUnit, registeredVoters: null });
    const dto = validDto();
    dto.accreditedVoters = 999999; // huge, but registered is unknown

    await service.submit(dto, adminUser);

    expect(createdResult.anomalyReasons).not.toContain('Accredited voters exceed registered voters');
    expect(createdResult.isAnomalous).toBe(false);
  });

  it('flags anomaly when valid votes + rejected ballots do not equal total cast', async () => {
    const dto = validDto();
    dto.rejectedBallots = 50; // 480 + 50 = 530 != 500 cast

    await service.submit(dto, adminUser);

    expect(createdResult.isAnomalous).toBe(true);
    expect(createdResult.anomalyReasons).toContain(
      'Valid votes + rejected ballots do not equal total votes cast',
    );
  });

  it('flags anomaly when sum of party votes does not match total valid votes', async () => {
    const dto = validDto();
    dto.partyScores = [
      { partyId: 'party-a', votes: 300 },
      { partyId: 'party-b', votes: 100 }, // sum 400 != 480 valid
    ];

    await service.submit(dto, adminUser);

    expect(createdResult.isAnomalous).toBe(true);
    expect(createdResult.anomalyReasons).toContain('Sum of party votes does not match total valid votes');
  });

  it('accumulates multiple anomaly reasons in a single submission', async () => {
    const dto: SubmitResultDto = {
      pollingUnitId: 'pu-1',
      accreditedVoters: 2000, // > registered
      totalVotesCast: 500,
      rejectedBallots: 100, // 480 + 100 = 580 != 500
      totalValidVotes: 480,
      partyScores: [{ partyId: 'party-a', votes: 10 }], // 10 != 480
    };

    await service.submit(dto, adminUser);

    expect(createdResult.isAnomalous).toBe(true);
    expect(createdResult.anomalyReasons).toEqual(
      expect.arrayContaining([
        'Accredited voters exceed registered voters',
        'Valid votes + rejected ballots do not equal total votes cast',
        'Sum of party votes does not match total valid votes',
      ]),
    );
    expect(createdResult.anomalyReasons).toHaveLength(3);
    expect(realtimeGateway.emitAnomaly).toHaveBeenCalledTimes(1);
  });

  it('treats an empty party score list as a mismatch against non-zero valid votes', async () => {
    const dto = validDto();
    dto.partyScores = []; // sum 0 != 480 valid

    await service.submit(dto, adminUser);

    expect(createdResult.isAnomalous).toBe(true);
    expect(createdResult.anomalyReasons).toContain('Sum of party votes does not match total valid votes');
  });

  it('throws NotFoundException when the polling unit does not exist', async () => {
    puRepo.findOne.mockResolvedValue(null);

    await expect(service.submit(validDto(), adminUser)).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when a result already exists for the polling unit', async () => {
    puRepo.findOne.mockResolvedValue({ ...pollingUnit, result: { id: 'existing' } });

    await expect(service.submit(validDto(), adminUser)).rejects.toThrow(ConflictException);
  });

  it('forbids an agent from submitting for a polling unit they are not assigned to', async () => {
    const agent = { id: 'agent-1', role: Role.AGENT, pollingUnit: { id: 'other-pu' } } as User;

    await expect(service.submit(validDto(), agent)).rejects.toThrow(ForbiddenException);
  });

  describe('flag', () => {
    it('appends the ballot-stuffing reason when votes cast exceed accredited voters', async () => {
      resultRepo.findOne.mockResolvedValue({
        id: 'result-1',
        accreditedVoters: 400,
        totalVotesCast: 500, // 500 > 400
      });

      await service.flag('result-1', ['Manual review requested']);

      const updatePayload = resultRepo.update.mock.calls[0][1];
      expect(updatePayload.isAnomalous).toBe(true);
      expect(updatePayload.status).toBe('flagged');
      expect(updatePayload.anomalyReasons).toEqual([
        'Manual review requested',
        'Total votes cast exceed accredited voters',
      ]);
      expect(realtimeGateway.emitAnomaly).toHaveBeenCalledTimes(1);
    });

    it('does not append the ballot-stuffing reason when totals are consistent', async () => {
      resultRepo.findOne.mockResolvedValue({
        id: 'result-1',
        accreditedVoters: 500,
        totalVotesCast: 500,
      });

      await service.flag('result-1', ['Manual review requested']);

      const updatePayload = resultRepo.update.mock.calls[0][1];
      expect(updatePayload.anomalyReasons).toEqual(['Manual review requested']);
    });

    it('does not duplicate the ballot-stuffing reason if already supplied', async () => {
      resultRepo.findOne.mockResolvedValue({
        id: 'result-1',
        accreditedVoters: 400,
        totalVotesCast: 500,
      });

      await service.flag('result-1', ['Total votes cast exceed accredited voters']);

      const updatePayload = resultRepo.update.mock.calls[0][1];
      expect(updatePayload.anomalyReasons).toEqual(['Total votes cast exceed accredited voters']);
    });
  });
});
