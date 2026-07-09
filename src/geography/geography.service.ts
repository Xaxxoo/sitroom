import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lga } from './entities/lga.entity';
import { Ward } from './entities/ward.entity';
import { PollingUnit } from './entities/polling-unit.entity';
import { paginated } from '../common/dto/pagination.dto';

@Injectable()
export class GeographyService {
  constructor(
    @InjectRepository(Lga) private lgaRepo: Repository<Lga>,
    @InjectRepository(Ward) private wardRepo: Repository<Ward>,
    @InjectRepository(PollingUnit) private puRepo: Repository<PollingUnit>,
  ) {}

  async getLgas(page = 1, limit = 20) {
    const [data, total] = await this.lgaRepo.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(data, total, page, limit);
  }

  async getLga(id: string) {
    const lga = await this.lgaRepo.findOne({ where: { id }, relations: ['wards'] });
    if (!lga) throw new NotFoundException('LGA not found');
    return lga;
  }

  async getWards(lgaId?: string, page = 1, limit = 20) {
    const qb = this.wardRepo.createQueryBuilder('ward').leftJoinAndSelect('ward.lga', 'lga');
    if (lgaId) qb.where('lga.id = :lgaId', { lgaId });
    const [data, total] = await qb.orderBy('ward.name', 'ASC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async getWard(id: string) {
    const ward = await this.wardRepo.findOne({ where: { id }, relations: ['lga', 'pollingUnits'] });
    if (!ward) throw new NotFoundException('Ward not found');
    return ward;
  }

  async getPollingUnits(wardId?: string, lgaId?: string, page = 1, limit = 20) {
    const qb = this.puRepo.createQueryBuilder('pu')
      .leftJoinAndSelect('pu.ward', 'ward')
      .leftJoinAndSelect('ward.lga', 'lga')
      .leftJoinAndSelect('pu.result', 'result');

    if (wardId) qb.where('ward.id = :wardId', { wardId });
    else if (lgaId) qb.where('lga.id = :lgaId', { lgaId });

    const [data, total] = await qb.orderBy('pu.name', 'ASC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async getPollingUnit(id: string) {
    const pu = await this.puRepo.findOne({ where: { id }, relations: ['ward', 'ward.lga', 'result'] });
    if (!pu) throw new NotFoundException('Polling unit not found');
    return pu;
  }

  async createLga(data: Partial<Lga>) {
    const lga = this.lgaRepo.create(data);
    return this.lgaRepo.save(lga);
  }

  async createWard(data: Partial<Ward>) {
    const ward = this.wardRepo.create(data);
    return this.wardRepo.save(ward);
  }

  async createPollingUnit(data: Partial<PollingUnit>) {
    const pu = this.puRepo.create(data);
    return this.puRepo.save(pu);
  }

  async getStats() {
    const [lgaCount, wardCount, puCount] = await Promise.all([
      this.lgaRepo.count(),
      this.wardRepo.count(),
      this.puRepo.count(),
    ]);
    return { lgas: lgaCount, wards: wardCount, pollingUnits: puCount };
  }
}
