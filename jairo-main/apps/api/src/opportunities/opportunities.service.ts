import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { opportunities, companies } from '@repo/database/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * List opportunities for a specific company
   */
  async getOpportunitiesForCompany(companyId: string) {
    const result = await this.db.drizzle.query.opportunities.findMany({
      where: eq(opportunities.companyId, companyId),
      with: {
        sourceCompany: true,
      },
      orderBy: (opportunities, { desc }) => [desc(opportunities.createdAt)],
    });

    // Trigger background scan
    this.scanForOpportunities(companyId).catch((err) =>
      this.logger.error(`Auto-scan failed for ${companyId}`, err),
    );

    return result;
  }

  /**
   * Automatic Detection Logic (Algorithm 2026)
   */
  async scanForOpportunities(companyId: string) {
    this.logger.log(`🔍 Scanning automatic opportunities for company: ${companyId}`);

    const company = await this.db.drizzle.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company?.sectorId) return;

    // Find companies in same sector that don't have relationships or opportunities yet
    const matches = await this.db.drizzle
      .select()
      .from(companies)
      .where(
        and(
          ne(companies.id, companyId),
          eq(companies.sectorId, company.sectorId),
          // Subquery for existing opportunities
          sql`${companies.id} NOT IN (SELECT source_company_id FROM opportunities WHERE company_id = ${companyId})`,
        ),
      )
      .limit(5);

    for (const match of matches) {
      await this.db.drizzle.insert(opportunities).values({
        companyId,
        sourceCompanyId: match.id,
        title: `Potencial Alianza: ${match.name}`,
        description: `Hemos detectado que ${match.name} opera en tu mismo sector y podría ser un socio estratégico.`,
        type: 'match',
        probability: '0.85',
        status: 'open',
      });
    }

    this.logger.log(`✨ Found ${matches.length} new opportunities for ${companyId}`);
  }
}
