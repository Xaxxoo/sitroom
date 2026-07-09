import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Party } from './entities/party.entity';
import { paginated } from '../common/dto/pagination.dto';

@Injectable()
export class PartiesService {
  constructor(
    @InjectRepository(Party)
    private readonly repo: Repository<Party>,
  ) {}

  async findAll(activeOnly = true, page = 1, limit = 20) {
    const where = activeOnly ? { isActive: true } : {};
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { abbreviation: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginated(data, total, page, limit);
  }

  async findOne(id: string) {
    const party = await this.repo.findOne({ where: { id } });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  async create(data: Partial<Party>) {
    const party = this.repo.create(data);
    return this.repo.save(party);
  }

  async update(id: string, data: Partial<Party>) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repo.update(id, { isActive: false });
  }

  async bulkCreate(parties: Partial<Party>[]) {
    const entities = this.repo.create(parties);
    return this.repo.save(entities);
  }
}
