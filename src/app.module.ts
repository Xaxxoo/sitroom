import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
