import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Ward } from './ward.entity';

@Entity('lgas')
export class Lga {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  registeredVoters: number;

  @OneToMany(() => Ward, (ward) => ward.lga)
  wards: Ward[];

  @CreateDateColumn()
  createdAt: Date;
}
