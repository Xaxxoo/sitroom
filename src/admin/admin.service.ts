import { Injectable, ConflictException } from '@nestjs/common';
import { GeographyService } from '../geography/geography.service';
import { PartiesService } from '../parties/parties.service';
import { UsersService } from '../users/users.service';
import { ResultsService } from '../results/results.service';
import { IncidentsService } from '../incidents/incidents.service';
import { Role } from '../common/enums/role.enum';
import { IncidentType, IncidentSeverity } from '../common/enums/incident-type.enum';
import * as bcrypt from 'bcryptjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const csv = require('csv-parser');
import { Readable } from 'stream';

@Injectable()
export class AdminService {
  constructor(
    private geographyService: GeographyService,
    private partiesService: PartiesService,
    private usersService: UsersService,
    private resultsService: ResultsService,
    private incidentsService: IncidentsService,
  ) {}

  async bootstrapAdmin(dto: { phone: string; name: string; password: string }) {
    const existing = await this.usersService.findAll();
    if (existing.length > 0) {
      throw new ConflictException('Bootstrap is disabled — users already exist');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const admin = await this.usersService.create({
      phone: dto.phone,
      name: dto.name,
      password: hashed,
      role: Role.ADMIN,
      isActive: true,
    });
    return { message: 'Admin created', id: admin.id, phone: admin.phone, role: admin.role };
  }

  async importGeographyFromCsv(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const rows: any[] = await new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(buffer.toString());
      stream
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    const lgaCache: Record<string, any> = {};
    const wardCache: Record<string, any> = {};
    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const lgaName = (row.lga || row.LGA || '').trim();
        const wardName = (row.ward || row.Ward || row.WARD || '').trim();
        const puName = (row.polling_unit || row.pu || row.PU || row['Polling Unit'] || '').trim();
        const puCode = (row.pu_code || row.code || row.Code || '').trim();
        const registeredVoters = parseInt(row.registered_voters || row.rv || '0') || 0;

        if (!lgaName || !wardName || !puName) {
          errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
          continue;
        }

        if (!lgaCache[lgaName]) {
          lgaCache[lgaName] = await this.geographyService.createLga({ name: lgaName });
        }

        const wardKey = `${lgaName}__${wardName}`;
        if (!wardCache[wardKey]) {
          wardCache[wardKey] = await this.geographyService.createWard({
            name: wardName,
            lga: lgaCache[lgaName],
          });
        }

        await this.geographyService.createPollingUnit({
          name: puName,
          code: puCode,
          registeredVoters,
          ward: wardCache[wardKey],
        });

        imported++;
      } catch (err) {
        errors.push(`Error importing row: ${err.message}`);
      }
    }

    return { imported, errors };
  }

  async seedDefaultParties() {
    const defaults = [
      { name: 'All Progressives Congress', abbreviation: 'APC', color: '#00AA00' },
      { name: "People's Democratic Party", abbreviation: 'PDP', color: '#FF0000' },
      { name: 'Labour Party', abbreviation: 'LP', color: '#FF6600' },
      { name: 'New Nigeria Peoples Party', abbreviation: 'NNPP', color: '#0000FF' },
      { name: 'Social Democratic Party', abbreviation: 'SDP', color: '#800080' },
      { name: 'All Progressives Grand Alliance', abbreviation: 'APGA', color: '#006400' },
    ];
    return this.partiesService.bulkCreate(defaults);
  }

  async seedDemoData() {
    const existingLgas = await this.geographyService.getLgas();
    if (existingLgas.meta.total > 0) {
      return { message: 'Demo data already exists — database is not empty', seeded: false };
    }

    // Seed parties
    await this.seedDefaultParties();
    const { data: parties } = await this.partiesService.findAll(true, 1, 100);

    // Get admin user (must exist via /admin/bootstrap first)
    const admins = await this.usersService.findAll({ role: Role.ADMIN });
    const adminUser = admins[0];

    // Geography: 3 LGAs × 3 wards × 3 polling units = 27 PUs
    const geoConfig = [
      {
        name: 'Abuja Municipal Area Council', code: 'AMAC', registeredVoters: 85000,
        wards: [
          { name: 'Wuse Ward', code: 'WUS', registeredVoters: 28000, puNames: ['Central Market Square', 'Primary School Annex A', 'Community Centre Hall'] },
          { name: 'Garki Ward', code: 'GAR', registeredVoters: 30000, puNames: ['NNPC Residential Quarters', 'Old Garki Village Hall', 'Barracks Compound'] },
          { name: 'Maitama Ward', code: 'MAI', registeredVoters: 27000, puNames: ['Embassy Row Primary School', 'Diplomatic Drive Centre', 'Life Camp Junction Hall'] },
        ],
      },
      {
        name: 'Gwagwalada Area Council', code: 'GWAG', registeredVoters: 62000,
        wards: [
          { name: 'Gwagwalada Central Ward', code: 'GWC', registeredVoters: 22000, puNames: ['Main Market Shed', 'Primary Health Centre Grounds', 'Old Motor Park'] },
          { name: 'Dobi Ward', code: 'DOB', registeredVoters: 18000, puNames: ['Dobi Town Hall', 'Rural School Block B', 'Farmers Cooperative Hall'] },
          { name: 'Zuba Ward', code: 'ZUB', registeredVoters: 22000, puNames: ['Zuba Junction School', 'Kuje-Zuba Road Primary', 'Clinic Open Grounds'] },
        ],
      },
      {
        name: 'Bwari Area Council', code: 'BWARI', registeredVoters: 55000,
        wards: [
          { name: 'Bwari Central Ward', code: 'BWC', registeredVoters: 20000, puNames: ['Bwari Town Hall', 'Area Council Secretariat Annex', 'Primary School Main Block'] },
          { name: 'Ushafa Ward', code: 'USH', registeredVoters: 17000, puNames: ['Ushafa Market Square', 'Village Elder Council Hall', 'River View Primary School'] },
          { name: 'Kubwa Ward', code: 'KUB', registeredVoters: 18000, puNames: ['Kubwa Phase 1 Centre', 'Mpape Junction Hall', 'Byazhin Community School'] },
        ],
      },
    ];

    const allPUs: Array<{ pu: any; ward: any; lga: any }> = [];

    for (const lgaConf of geoConfig) {
      const lga = await this.geographyService.createLga({
        name: lgaConf.name,
        code: lgaConf.code,
        registeredVoters: lgaConf.registeredVoters,
      });

      for (const wardConf of lgaConf.wards) {
        const ward = await this.geographyService.createWard({
          name: wardConf.name,
          code: wardConf.code,
          registeredVoters: wardConf.registeredVoters,
          lga,
        });

        for (let i = 0; i < wardConf.puNames.length; i++) {
          const pu = await this.geographyService.createPollingUnit({
            name: wardConf.puNames[i],
            code: `PU/${lgaConf.code}/${wardConf.code}/${String(i + 1).padStart(3, '0')}`,
            registeredVoters: Math.floor(wardConf.registeredVoters / 3),
            ward,
          });
          allPUs.push({ pu, ward, lga });
        }
      }
    }

    // Submit results for 20 of 27 PUs — vote counts: [APC, PDP, LP, NNPP, SDP, APGA]
    const voteTemplates = [
      [312, 198, 145, 42, 18, 10], // APC wins
      [198, 310, 98,  35, 22,  8], // PDP wins
      [145, 187, 290, 48, 15, 12], // LP wins
      [398, 210, 122, 38, 20,  7], // APC wins big
      [256, 289, 178, 55, 28, 14], // PDP wins
      [423, 178, 145, 30, 16,  9], // APC wins big
      [198, 243, 312, 40, 18, 11], // LP wins
      [334, 201, 156, 44, 21,  8], // APC wins
      [167, 312, 167, 38, 24,  9], // PDP wins
      [445, 189, 123, 36, 14,  7], // APC wins big
    ];

    const pusToReport = allPUs.slice(0, 20); // leave 7 unreported
    let resultsCreated = 0;

    for (let i = 0; i < pusToReport.length; i++) {
      const { pu } = pusToReport[i];
      const template = voteTemplates[i % voteTemplates.length];

      const partyScores = parties.map((party, j) => ({
        partyId: party.id,
        votes: template[j] ?? 0,
      }));

      const totalValidVotes = partyScores.reduce((sum, s) => sum + s.votes, 0);
      const rejectedBallots = Math.ceil(totalValidVotes * 0.015);
      const totalVotesCast = totalValidVotes + rejectedBallots;
      const accreditedVoters = Math.ceil(totalVotesCast * 1.08);

      await this.resultsService.submit(
        { pollingUnitId: pu.id, accreditedVoters, totalVotesCast, rejectedBallots, totalValidVotes, partyScores },
        adminUser,
      );
      resultsCreated++;
    }

    // Create incidents
    const incidentDefs = [
      {
        type: IncidentType.VIOLENCE,
        severity: IncidentSeverity.CRITICAL,
        description: 'Armed thugs disrupted voting, injuring two INEC officials and attempting to seize ballot materials. Security forces alerted and area cordoned off.',
        lgaId: allPUs[3].lga.id,
        wardId: allPUs[3].ward.id,
        pollingUnitId: allPUs[3].pu.id,
      },
      {
        type: IncidentType.VOTE_BUYING,
        severity: IncidentSeverity.HIGH,
        description: 'Party agents observed distributing cash to voters within 200m of the polling unit. Over 15 persons approached. INEC officials and police notified.',
        lgaId: allPUs[0].lga.id,
        wardId: allPUs[0].ward.id,
        pollingUnitId: allPUs[0].pu.id,
      },
      {
        type: IncidentType.LATE_MATERIALS,
        severity: IncidentSeverity.MEDIUM,
        description: 'Ballot papers and result sheets arrived 3 hours late. Voting commenced at 11:30am instead of the scheduled 8:30am start time.',
        lgaId: allPUs[6].lga.id,
        wardId: allPUs[6].ward.id,
      },
      {
        type: IncidentType.INTIMIDATION,
        severity: IncidentSeverity.HIGH,
        description: 'Unidentified individuals in partial uniforms are intimidating voters in the queue. Several voters have left without casting their ballots.',
        lgaId: allPUs[9].lga.id,
        wardId: allPUs[9].ward.id,
      },
      {
        type: IncidentType.BALLOT_SNATCHING,
        severity: IncidentSeverity.CRITICAL,
        description: 'Ballot box seized by unknown individuals arriving on motorcycles. Voting suspended. Security reinforcements have been requested.',
        lgaId: allPUs[15].lga.id,
        wardId: allPUs[15].ward.id,
        pollingUnitId: allPUs[15].pu.id,
      },
      {
        type: IncidentType.AGENT_HARASSMENT,
        severity: IncidentSeverity.MEDIUM,
        description: 'Party agent forcibly removed from polling unit and accreditation badge destroyed. Matter reported to presiding officer and party command centre.',
        lgaId: allPUs[12].lga.id,
        wardId: allPUs[12].ward.id,
      },
    ];

    const createdIncidents: any[] = [];
    for (const def of incidentDefs) {
      const incident = await this.incidentsService.create(def as any, adminUser);
      createdIncidents.push(incident);
    }

    // Escalate two critical incidents and resolve one to show the full lifecycle
    await this.incidentsService.escalate(createdIncidents[0].id);
    await this.incidentsService.escalate(createdIncidents[4].id);
    await this.incidentsService.resolve(
      createdIncidents[2].id,
      adminUser,
      'Materials delivered and voting resumed at 11:45am. INEC officials confirmed all materials accounted for.',
    );

    return {
      seeded: true,
      parties: parties.length, // local array after destructure
      lgas: geoConfig.length,
      wards: geoConfig.reduce((sum, l) => sum + l.wards.length, 0),
      pollingUnits: allPUs.length,
      resultsSubmitted: resultsCreated,
      pollingUnitsUnreported: allPUs.length - resultsCreated,
      incidentsCreated: createdIncidents.length,
    };
  }

  async getDashboardStats() {
    const [geoStats, resultsAgg, incidentStats] = await Promise.all([
      this.geographyService.getStats(),
      this.resultsService.getAggregation(),
      this.incidentsService.getStats(),
    ]);
    return { geography: geoStats, results: resultsAgg, incidents: incidentStats };
  }
}
