import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Ward } from './ward.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('polling_units')
export class PollingUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  registeredVoters: number;

  @Column({ nullable: true })
  address: string;

  @ManyToOne(() => Ward, (ward) => ward.pollingUnits)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;

  @OneToOne(() => Result, (result) => result.pollingUnit, { nullable: true })
  result: Result;

  @CreateDateColumn()
  createdAt: Date;
}
