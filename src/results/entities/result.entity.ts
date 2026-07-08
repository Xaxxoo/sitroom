import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PollingUnit } from '../../geography/entities/polling-unit.entity';
import { User } from '../../users/entities/user.entity';
import { PartyScore } from './party-score.entity';

export enum ResultStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  FLAGGED = 'flagged',
  VERIFIED = 'verified',
}

@Entity('results')
export class Result {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => PollingUnit, (pu) => pu.result)
  @JoinColumn({ name: 'polling_unit_id' })
  pollingUnit: PollingUnit;

  @Column({ nullable: true })
  pollingUnitId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User;

  @Column({ type: 'enum', enum: ResultStatus, default: ResultStatus.SUBMITTED })
  status: ResultStatus;

  @Column({ default: 0 })
  accreditedVoters: number;

  @Column({ default: 0 })
  totalVotesCast: number;

  @Column({ default: 0 })
  rejectedBallots: number;

  @Column({ default: 0 })
  totalValidVotes: number;

  @Column({ nullable: true })
  iNecFormImageUrl: string;

  @Column({ default: false })
  isAnomalous: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  anomalyReasons: string[];

  @OneToMany(() => PartyScore, (score) => score.result, { cascade: true, eager: true })
  partyScores: PartyScore[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
