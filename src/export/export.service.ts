import { Injectable } from '@nestjs/common';
import { ResultsService } from '../results/results.service';
import { IncidentsService } from '../incidents/incidents.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  constructor(
    private resultsService: ResultsService,
    private incidentsService: IncidentsService,
  ) {}

  async exportResultsToExcel(filters?: { lgaId?: string; wardId?: string }): Promise<Buffer> {
    const { data: results } = await this.resultsService.findAll(filters, 1, 10_000);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sitroom';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Results');

    sheet.columns = [
      { header: 'Polling Unit', key: 'pu', width: 30 },
      { header: 'Ward', key: 'ward', width: 20 },
      { header: 'LGA', key: 'lga', width: 20 },
      { header: 'Accredited Voters', key: 'accredited', width: 18 },
      { header: 'Total Votes Cast', key: 'totalCast', width: 18 },
      { header: 'Rejected Ballots', key: 'rejected', width: 18 },
      { header: 'Total Valid Votes', key: 'validVotes', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Anomalous', key: 'anomalous', width: 12 },
      { header: 'Submitted By', key: 'submittedBy', width: 20 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 },
    ];

    const parties = new Set<string>();
    results.forEach((r) => r.partyScores?.forEach((s) => parties.add(s.party.abbreviation)));

    parties.forEach((abbr) => {
      sheet.columns = [...sheet.columns, { header: abbr, key: abbr, width: 12 }];
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const result of results) {
      const row: any = {
        pu: result.pollingUnit?.name || '',
        ward: result.pollingUnit?.ward?.name || '',
        lga: result.pollingUnit?.ward?.lga?.name || '',
        accredited: result.accreditedVoters,
        totalCast: result.totalVotesCast,
        rejected: result.rejectedBallots,
        validVotes: result.totalValidVotes,
        status: result.status,
        anomalous: result.isAnomalous ? 'YES' : 'NO',
        submittedBy: result.submittedBy?.name || result.submittedBy?.phone || '',
        submittedAt: result.createdAt?.toISOString() || '',
      };

      result.partyScores?.forEach((s) => {
        row[s.party.abbreviation] = s.votes;
      });

      const addedRow = sheet.addRow(row);
      if (result.isAnomalous) {
        addedRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };
      }
    }

    sheet.autoFilter = { from: 'A1', to: sheet.getRow(1).getCell(sheet.columns.length).address };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportIncidentsToExcel(filters?: { lgaId?: string; wardId?: string }): Promise<Buffer> {
    const { data: incidents } = await this.incidentsService.findAll(filters, 1, 10_000);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Incidents');

    sheet.columns = [
      { header: 'Type', key: 'type', width: 22 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Polling Unit', key: 'pu', width: 25 },
      { header: 'Ward', key: 'ward', width: 20 },
      { header: 'LGA', key: 'lga', width: 20 },
      { header: 'Reported By', key: 'reportedBy', width: 20 },
      { header: 'Reported At', key: 'reportedAt', width: 22 },
      { header: 'Resolution Note', key: 'note', width: 35 },
      { header: 'Resolved At', key: 'resolvedAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7B2D00' },
    };

    const severityColors: Record<string, string> = {
      critical: 'FFFF0000',
      high: 'FFFF6B00',
      medium: 'FFFFF2CC',
      low: 'FFD9EAD3',
    };

    for (const incident of incidents) {
      const addedRow = sheet.addRow({
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        description: incident.description,
        pu: incident.pollingUnit?.name || '',
        ward: incident.ward?.name || '',
        lga: incident.lga?.name || '',
        reportedBy: incident.reportedBy?.name || incident.reportedBy?.phone || '',
        reportedAt: incident.createdAt?.toISOString() || '',
        note: incident.resolutionNote || '',
        resolvedAt: incident.resolvedAt?.toISOString() || '',
      });

      if (severityColors[incident.severity]) {
        addedRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: severityColors[incident.severity] },
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportStateSummaryToExcel(): Promise<Buffer> {
    const [aggregation, lgaBreakdown] = await Promise.all([
      this.resultsService.getAggregation(),
      this.resultsService.getLgaAggregation(),
    ]);

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('State Summary');
    summarySheet.addRow(['ELECTION RESULTS - STATE SUMMARY']).font = { bold: true, size: 14 };
    summarySheet.addRow([`Generated: ${new Date().toISOString()}`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Metric', 'Value']).font = { bold: true };
    summarySheet.addRow(['Polling Units Reporting', aggregation.puReporting]);
    summarySheet.addRow(['Total Accredited Voters', aggregation.totalAccredited]);
    summarySheet.addRow(['Total Votes Cast', aggregation.totalVotesCast]);
    summarySheet.addRow(['Total Valid Votes', aggregation.totalValidVotes]);
    summarySheet.addRow(['Rejected Ballots', aggregation.totalRejected]);
    summarySheet.addRow(['Anomalous Results', aggregation.anomalousCount]);
    summarySheet.addRow([]);
    summarySheet.addRow(['PARTY RESULTS']).font = { bold: true };
    summarySheet.addRow(['Party', 'Abbreviation', 'Total Votes']).font = { bold: true };

    aggregation.partySummary.forEach((p) => {
      summarySheet.addRow([p.name, p.abbreviation, p.totalVotes]);
    });

    const lgaSheet = workbook.addWorksheet('LGA Breakdown');
    lgaSheet.addRow(['LGA', 'PUs Reporting', ...aggregation.partySummary.map((p) => p.abbreviation)]).font = { bold: true };

    lgaBreakdown.forEach((lga: any) => {
      lgaSheet.addRow([
        lga.lgaName,
        lga.puReporting,
        ...aggregation.partySummary.map((p) => lga.partyTotals[p.abbreviation] || 0),
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
