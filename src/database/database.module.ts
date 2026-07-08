import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Lga } from '../geography/entities/lga.entity';
import { Ward } from '../geography/entities/ward.entity';
import { PollingUnit } from '../geography/entities/polling-unit.entity';
import { Party } from '../parties/entities/party.entity';
import { Result } from '../results/entities/result.entity';
import { PartyScore } from '../results/entities/party-score.entity';
import { Incident } from '../incidents/entities/incident.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [User, Lga, Ward, PollingUnit, Party, Result, PartyScore, Incident],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
