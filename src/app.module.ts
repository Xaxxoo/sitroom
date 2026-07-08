import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GeographyModule } from './geography/geography.module';
import { PartiesModule } from './parties/parties.module';
import { ResultsModule } from './results/results.module';
import { IncidentsModule } from './incidents/incidents.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ExportModule } from './export/export.module';
import { AdminModule } from './admin/admin.module';
import configuration from './common/config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GeographyModule,
    PartiesModule,
    ResultsModule,
    IncidentsModule,
    RealtimeModule,
    ExportModule,
    AdminModule,
  ],
})
export class AppModule {}
