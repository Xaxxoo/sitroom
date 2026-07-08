import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.repo.findOne({ where: { phone } });
  }

  async findAll(filters?: { role?: string; lgaId?: string; wardId?: string }) {
    const qb = this.repo.createQueryBuilder('user')
      .leftJoinAndSelect('user.lga', 'lga')
      .leftJoinAndSelect('user.ward', 'ward')
      .leftJoinAndSelect('user.pollingUnit', 'pollingUnit');

    if (filters?.role) qb.andWhere('user.role = :role', { role: filters.role });
    if (filters?.lgaId) qb.andWhere('lga.id = :lgaId', { lgaId: filters.lgaId });
    if (filters?.wardId) qb.andWhere('ward.id = :wardId', { wardId: filters.wardId });

    return qb.getMany();
  }

  async updateLastSeen(id: string) {
    await this.repo.update(id, { lastSeenAt: new Date() });
  }

  async update(id: string, data: Partial<User>) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.repo.update(id, { isActive: false });
  }
}
