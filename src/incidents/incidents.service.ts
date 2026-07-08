import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentStatus } from '../common/enums/incident-type.enum';
import { User } from '../users/entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident) private repo: Repository<Incident>,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateIncidentDto, reportedBy: User) {
    const incident = this.repo.create({
      ...dto,
      pollingUnit: dto.pollingUnitId ? { id: dto.pollingUnitId } as any : null,
      ward: dto.wardId ? { id: dto.wardId } as any : null,
      lga: dto.lgaId ? { id: dto.lgaId } as any : null,
      reportedBy,
    });
    const saved = await this.repo.save(incident);
    const loaded = await this.findOne(saved.id);
    this.realtimeGateway.emitIncidentReported(loaded);
    return loaded;
  }

  async findAll(filters?: { lgaId?: string; wardId?: string; severity?: string; status?: string }) {
    const qb = this.repo.createQueryBuilder('incident')
      .leftJoinAndSelect('incident.pollingUnit', 'pu')
      .leftJoinAndSelect('incident.ward', 'ward')
      .leftJoinAndSelect('incident.lga', 'lga')
      .leftJoinAndSelect('incident.reportedBy', 'reportedBy')
      .orderBy('incident.createdAt', 'DESC');

    if (filters?.lgaId) qb.andWhere('lga.id = :lgaId', { lgaId: filters.lgaId });
    if (filters?.wardId) qb.andWhere('ward.id = :wardId', { wardId: filters.wardId });
    if (filters?.severity) qb.andWhere('incident.severity = :severity', { severity: filters.severity });
    if (filters?.status) qb.andWhere('incident.status = :status', { status: filters.status });

    return qb.getMany();
  }

  async findOne(id: string) {
    const incident = await this.repo.findOne({
      where: { id },
      relations: ['pollingUnit', 'ward', 'lga', 'reportedBy', 'resolvedBy'],
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async escalate(id: string) {
    await this.repo.update(id, { status: IncidentStatus.ESCALATED });
    const incident = await this.findOne(id);
    this.realtimeGateway.emitIncidentUpdated(incident);
    return incident;
  }

  async resolve(id: string, resolvedBy: User, note: string) {
    await this.repo.update(id, {
      status: IncidentStatus.RESOLVED,
      resolvedBy,
      resolutionNote: note,
      resolvedAt: new Date(),
    });
    const incident = await this.findOne(id);
    this.realtimeGateway.emitIncidentUpdated(incident);
    return incident;
  }

  async getStats() {
    const [total, open, escalated, resolved, critical] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: IncidentStatus.OPEN } }),
      this.repo.count({ where: { status: IncidentStatus.ESCALATED } }),
      this.repo.count({ where: { status: IncidentStatus.RESOLVED } }),
      this.repo.count({ where: { severity: 'critical' as any } }),
    ]);
    return { total, open, escalated, resolved, critical };
  }
}
