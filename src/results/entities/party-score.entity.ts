import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Result } from './result.entity';
import { Party } from '../../parties/entities/party.entity';

@Entity('party_scores')
export class PartyScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Result, (result) => result.partyScores)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(() => Party, { eager: true })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @Column({ default: 0 })
  votes: number;
}
