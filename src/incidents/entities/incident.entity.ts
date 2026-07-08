import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IncidentType, IncidentSeverity, IncidentStatus } from '../../common/enums/incident-type.enum';
import { User } from '../../users/entities/user.entity';
import { PollingUnit } from '../../geography/entities/polling-unit.entity';
import { Ward } from '../../geography/entities/ward.entity';
import { Lga } from '../../geography/entities/lga.entity';

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: IncidentType })
  type: IncidentType;

  @Column({ type: 'enum', enum: IncidentSeverity, default: IncidentSeverity.MEDIUM })
  severity: IncidentSeverity;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  mediaUrls: string[];

  @ManyToOne(() => PollingUnit, { nullable: true, eager: true })
  @JoinColumn({ name: 'polling_unit_id' })
  pollingUnit: PollingUnit;

  @ManyToOne(() => Ward, { nullable: true, eager: true })
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;

  @ManyToOne(() => Lga, { nullable: true, eager: true })
  @JoinColumn({ name: 'lga_id' })
  lga: Lga;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'reported_by_id' })
  reportedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User;

  @Column({ nullable: true, type: 'text' })
  resolutionNote: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
