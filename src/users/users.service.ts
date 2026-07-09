import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { paginated } from '../common/dto/pagination.dto';

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
    const user = await this.repo.findOne({
      where: { id },
      relations: ['lga', 'ward', 'pollingUnit'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.repo.findOne({ where: { phone } });
  }

  async findAll(
    filters?: { role?: string; lgaId?: string; wardId?: string; isActive?: boolean },
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('user')
      .leftJoinAndSelect('user.lga', 'lga')
      .leftJoinAndSelect('user.ward', 'ward')
      .leftJoinAndSelect('user.pollingUnit', 'pollingUnit')
      .orderBy('user.createdAt', 'DESC');

    if (filters?.role) qb.andWhere('user.role = :role', { role: filters.role });
    if (filters?.lgaId) qb.andWhere('lga.id = :lgaId', { lgaId: filters.lgaId });
    if (filters?.wardId) qb.andWhere('ward.id = :wardId', { wardId: filters.wardId });
    if (filters?.isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.lgaId !== undefined) user.lga = { id: dto.lgaId } as any;
    if (dto.wardId !== undefined) user.ward = { id: dto.wardId } as any;
    if (dto.pollingUnitId !== undefined) user.pollingUnit = { id: dto.pollingUnitId } as any;

    await this.repo.save(user);
    return this.findOne(id);
  }

  async activate(id: string): Promise<User> {
    await this.repo.update(id, { isActive: true });
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<User> {
    await this.repo.update(id, { isActive: false });
    return this.findOne(id);
  }

  async updateLastSeen(id: string) {
    await this.repo.update(id, { lastSeenAt: new Date() });
  }
}
