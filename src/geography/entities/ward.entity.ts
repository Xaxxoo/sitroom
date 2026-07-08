import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Lga } from './lga.entity';
import { PollingUnit } from './polling-unit.entity';

@Entity('wards')
export class Ward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  registeredVoters: number;

  @ManyToOne(() => Lga, (lga) => lga.wards)
  @JoinColumn({ name: 'lga_id' })
  lga: Lga;

  @OneToMany(() => PollingUnit, (pu) => pu.ward)
  pollingUnits: PollingUnit[];

  @CreateDateColumn()
  createdAt: Date;
}
