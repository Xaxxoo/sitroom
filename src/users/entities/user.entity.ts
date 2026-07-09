import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';
import { Lga } from '../../geography/entities/lga.entity';
import { Ward } from '../../geography/entities/ward.entity';
import { PollingUnit } from '../../geography/entities/polling-unit.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.AGENT })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Lga, { nullable: true, eager: true })
  @JoinColumn({ name: 'lga_id' })
  lga: Lga;

  @ManyToOne(() => Ward, { nullable: true, eager: true })
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;

  @ManyToOne(() => PollingUnit, { nullable: true, eager: true })
  @JoinColumn({ name: 'polling_unit_id' })
  pollingUnit: PollingUnit;

  @Column({ nullable: true })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
