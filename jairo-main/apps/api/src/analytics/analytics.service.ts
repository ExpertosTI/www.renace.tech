import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService implements OnModuleInit {
    private readonly logger = new Logger(AnalyticsService.name);
    private readonly jwtSecret = process.env.JWT_SECRET;

    constructor(private readonly db: DatabaseService) { }

    async onModuleInit() {
        await this.initTables();
    }

    async getPublicStats() {
        const empresas = await this.db.query("SELECT COUNT(*) FROM companies WHERE status = 'active'");
        const sectores = await this.db.query("SELECT COUNT(*) FROM sectors");
        const conexiones = await this.db.query("SELECT COUNT(*) FROM company_relationships");

        return {
            totalEmpresas: parseInt(empresas.rows[0].count),
            totalSectores: parseInt(sectores.rows[0].count),
            totalConexiones: parseInt(conexiones.rows[0].count)
        };
    }

    private async initTables() {
        try {
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS profile_views (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    viewed_company_id UUID NOT NULL,
                    viewer_user_id UUID,
                    viewer_company_id UUID,
                    ip_address VARCHAR(50),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_profile_views_company ON profile_views(viewed_company_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_user_id);
            `);
            this.logger.log('✅ Analytics tables initialized');
        } catch (error) {
            this.logger.warn('Analytics tables may already exist');
        }
    }

    private getUserFromToken(token: string): any {
        if (!token || !this.jwtSecret) {
            return null;
        }
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch {
            return null;
        }
    }

    async getDashboardStats(token: string) {
        const user = this.getUserFromToken(token);
        if (!user) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        const stats: any = {};

        const views = await this.db.query(`
            SELECT COUNT(*) as total
            FROM profile_views
            WHERE viewed_company_id = $1
              AND created_at >= DATE_TRUNC('month', NOW())
        `, [user.companyId]);
        stats.profileViews = parseInt(views.rows[0].total);

        const connections = await this.db.query(`
            SELECT COUNT(*) as total
            FROM company_relationships
            WHERE (company_a_id = $1 OR company_b_id = $1)
              AND status = 'accepted'
        `, [user.companyId]);
        stats.connections = parseInt(connections.rows[0].total);

        const pending = await this.db.query(`
            SELECT COUNT(*) as total
            FROM company_relationships
            WHERE company_b_id = $1 AND status = 'pending'
        `, [user.companyId]);
        stats.pendingRequests = parseInt(pending.rows[0].total);

        const products = await this.db.query(`
            SELECT COUNT(*) as total
            FROM products
            WHERE company_id = $1 AND status = 'active'
        `, [user.companyId]);
        stats.products = parseInt(products.rows[0].total);

        const rfqs = await this.db.query(`
            SELECT COUNT(*) as total
            FROM rfqs r
            WHERE r.status = 'open'
              AND (r.is_public = true OR EXISTS (
                  SELECT 1 FROM rfq_targets rt WHERE rt.rfq_id = r.id AND rt.company_id = $1
              ))
        `, [user.companyId]);
        stats.openRfqs = parseInt(rfqs.rows[0].total);

        const messages = await this.db.query(`
            SELECT COUNT(*) as total
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.participant1_id = $1 OR c.participant2_id = $1)
              AND m.sender_id != $1
              AND m.read_at IS NULL
        `, [user.id]);
        stats.unreadMessages = parseInt(messages.rows[0].total);

        return { stats };
    }

    async getProfileViews(token: string) {
        const user = this.getUserFromToken(token);
        if (!user || !user.companyId) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        const views = await this.db.query(`
            SELECT 
                pv.*,
                u.name as viewer_name,
                u.avatar as viewer_avatar,
                c.name as viewer_company_name,
                c.slug as viewer_company_slug
            FROM profile_views pv
            LEFT JOIN users u ON pv.viewer_user_id = u.id
            LEFT JOIN companies c ON pv.viewer_company_id = c.id
            WHERE pv.viewed_company_id = $1
            ORDER BY pv.created_at DESC
            LIMIT 50
        `, [user.companyId]);

        const stats = await this.db.query(`
            SELECT 
                DATE_TRUNC('day', created_at) as fecha,
                COUNT(*) as vistas
            FROM profile_views
            WHERE viewed_company_id = $1
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY fecha
        `, [user.companyId]);

        return {
            vistas: views.rows,
            estadisticas: stats.rows,
            total: views.rows.length
        };
    }

    async recordProfileView(companyId: string, token: string) {
        const user = this.getUserFromToken(token);

        if (user && user.companyId === companyId) {
            return { recorded: false };
        }

        await this.db.query(`
            INSERT INTO profile_views (viewed_company_id, viewer_user_id, viewer_company_id)
            VALUES ($1, $2, $3)
        `, [companyId, user?.id || null, user?.companyId || null]);

        return { recorded: true };
    }

    async getConnectionsAnalytics(token: string) {
        const user = this.getUserFromToken(token);
        if (!user || !user.companyId) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        const bySector = await this.db.query(`
            SELECT 
                s.name as sector,
                COUNT(*) as total
            FROM company_relationships cr
            JOIN companies c ON (
                CASE WHEN cr.company_a_id = $1 THEN cr.company_b_id ELSE cr.company_a_id END = c.id
            )
            LEFT JOIN sectors s ON c.sector_id = s.id
            WHERE (cr.company_a_id = $1 OR cr.company_b_id = $1)
              AND cr.status = 'accepted'
            GROUP BY s.name
            ORDER BY total DESC
        `, [user.companyId]);

        const byType = await this.db.query(`
            SELECT 
                cr.relationship_type as tipo,
                COUNT(*) as total
            FROM company_relationships cr
            WHERE (cr.company_a_id = $1 OR cr.company_b_id = $1)
              AND cr.status = 'accepted'
            GROUP BY cr.relationship_type
        `, [user.companyId]);

        const growth = await this.db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as mes,
                COUNT(*) as nuevas
            FROM company_relationships
            WHERE (company_a_id = $1 OR company_b_id = $1)
              AND status = 'accepted'
              AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY mes
        `, [user.companyId]);

        return {
            porSector: bySector.rows,
            porTipo: byType.rows,
            crecimiento: growth.rows
        };
    }

    async getProductsAnalytics(token: string) {
        const user = this.getUserFromToken(token);
        if (!user || !user.companyId) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        const topViewed = await this.db.query(`
            SELECT id, name, views, price
            FROM products
            WHERE company_id = $1 AND status = 'active'
            ORDER BY views DESC
            LIMIT 10
        `, [user.companyId]);

        const totalViews = await this.db.query(`
            SELECT SUM(views) as total
            FROM products
            WHERE company_id = $1
        `, [user.companyId]);

        return {
            topProductos: topViewed.rows,
            totalVistas: parseInt(totalViews.rows[0].total) || 0
        };
    }

    async getRfqAnalytics(token: string) {
        const user = this.getUserFromToken(token);
        if (!user) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        const myRfqs = await this.db.query(`
            SELECT 
                status,
                COUNT(*) as total
            FROM rfqs
            WHERE requester_id = $1
            GROUP BY status
        `, [user.id]);

        const myQuotes = await this.db.query(`
            SELECT 
                status,
                COUNT(*) as total
            FROM rfq_quotes
            WHERE user_id = $1
            GROUP BY status
        `, [user.id]);

        const successRate = await this.db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'accepted') as aceptadas,
                COUNT(*) as total
            FROM rfq_quotes
            WHERE user_id = $1
        `, [user.id]);

        const rate = successRate.rows[0].total > 0
            ? (successRate.rows[0].aceptadas / successRate.rows[0].total * 100).toFixed(1)
            : 0;

        return {
            misRfqs: myRfqs.rows,
            misCotizaciones: myQuotes.rows,
            tasaExito: `${rate}%`
        };
    }

    async exportReport(type: string, format: string, token: string) {
        const user = this.getUserFromToken(token);
        if (!user) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        switch (type) {
            case 'dashboard':
                return this.getDashboardStats(token);
            case 'connections':
                return this.getConnectionsAnalytics(token);
            case 'products':
                return this.getProductsAnalytics(token);
            case 'rfqs':
                return this.getRfqAnalytics(token);
            default:
                throw new HttpException('Tipo de reporte inválido', HttpStatus.BAD_REQUEST);
        }
    }
}
