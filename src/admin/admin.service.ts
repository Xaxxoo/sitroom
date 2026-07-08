import { Injectable } from '@nestjs/common';
import { GeographyService } from '../geography/geography.service';
import { PartiesService } from '../parties/parties.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const csv = require('csv-parser');
import { Readable } from 'stream';

@Injectable()
export class AdminService {
  constructor(
    private geographyService: GeographyService,
    private partiesService: PartiesService,
  ) {}

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

  async getDashboardStats() {
    const [geoStats] = await Promise.all([this.geographyService.getStats()]);
    return { geography: geoStats };
  }
}
