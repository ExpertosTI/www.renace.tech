import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../core/email/email.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly emailService: EmailService,
        private readonly db: DatabaseService
    ) { }

    async getSystemStats() {
        const users = await this.db.query('SELECT COUNT(*) FROM users');
        const companies = await this.db.query('SELECT COUNT(*) FROM companies');
        const rfqs = await this.db.query('SELECT COUNT(*) FROM rfqs');
        const products = await this.db.query('SELECT COUNT(*) FROM products');

        const recentUsers = await this.db.query('SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5');
        const recentCompanies = await this.db.query('SELECT name, status, created_at FROM companies ORDER BY created_at DESC LIMIT 5');

        return {
            counts: {
                users: parseInt(users.rows[0].count),
                companies: parseInt(companies.rows[0].count),
                rfqs: parseInt(rfqs.rows[0].count),
                products: parseInt(products.rows[0].count)
            },
            recent: {
                users: recentUsers.rows,
                companies: recentCompanies.rows
            }
        };
    }

    async getPendingCompanies() {
        const result = await this.db.query(`
            SELECT c.*, u.name as admin_name, u.email as admin_email
            FROM companies c
            LEFT JOIN users u ON u.company_id = c.id AND u.role = 'admin'
            WHERE c.status = 'pending'
            ORDER BY c.created_at ASC
        `);
        return result.rows;
    }

    async approveCompany(companyId: string) {
        const pool = this.db.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE companies SET status = \'active\' WHERE id = $1', [companyId]);

            const res = await client.query(`
                SELECT c.name, u.email
                FROM companies c
                JOIN users u ON u.company_id = c.id AND u.role = 'admin'
                WHERE c.id = $1
            `, [companyId]);

            await client.query('COMMIT');

            if (res.rows.length > 0) {
                const { name, email } = res.rows[0];
                this.emailService.sendCompanyApproved(email, name).catch(err =>
                    this.logger.error(`Failed to send approval email to ${email}`, err)
                );
            }

            return { message: 'Empresa aprobada' };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async rejectCompany(companyId: string) {
        const pool = this.db.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE companies SET status = \'suspended\' WHERE id = $1', [companyId]);

            const res = await client.query(`
                SELECT c.name, u.email
                FROM companies c
                JOIN users u ON u.company_id = c.id AND u.role = 'admin'
                WHERE c.id = $1
            `, [companyId]);

            await client.query('COMMIT');

            if (res.rows.length > 0) {
                const { name, email } = res.rows[0];
                this.emailService.sendCompanyRejected(email, name).catch(err =>
                    this.logger.error(`Failed to send rejection email to ${email}`, err)
                );
            }

            return { message: 'Empresa rechazada/suspendida' };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
