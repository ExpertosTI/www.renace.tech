import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../core/email/email.service';
import { DatabaseService } from '../database/database.service';

export type NotificationType =
    | 'connection_request'
    | 'connection_accepted'
    | 'new_message'
    | 'rfq_received'
    | 'rfq_quote'
    | 'rfq_accepted'
    | 'profile_view'
    | 'system';

@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly jwtSecret = process.env.JWT_SECRET;

    constructor(
        private readonly emailService: EmailService,
        private readonly db: DatabaseService
    ) { }

    async onModuleInit() {
        await this.initTables();
    }

    private async initTables() {
        try {
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    title VARCHAR(300) NOT NULL,
                    message TEXT,
                    link VARCHAR(500),
                    data JSONB,
                    read_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS notification_preferences (
                    user_id UUID PRIMARY KEY,
                    email_connections BOOLEAN DEFAULT true,
                    email_messages BOOLEAN DEFAULT true,
                    email_rfqs BOOLEAN DEFAULT true,
                    push_enabled BOOLEAN DEFAULT true,
                    updated_at TIMESTAMP DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
            `);
            this.logger.log('✅ Notifications tables initialized');
        } catch (error) {
            this.logger.warn('Notifications tables may already exist');
        }
    }

    private getUserFromToken(token: string): any {
        if (!token || !this.jwtSecret) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch {
            throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
        }
    }

    async create(userId: string, type: NotificationType, title: string, message?: string, link?: string, data?: any) {
        try {
            const result = await this.db.query(`
                INSERT INTO notifications (user_id, type, title, message, link, data)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [userId, type, title, message, link, data ? JSON.stringify(data) : null]);

            const prefs = await this.db.query(
                'SELECT * FROM notification_preferences WHERE user_id = $1',
                [userId]
            );

            if (prefs.rows.length > 0) {
                const p = prefs.rows[0];
                let shouldEmail = false;

                if (type.includes('connection') && p.email_connections) shouldEmail = true;
                if (type.includes('message') && p.email_messages) shouldEmail = true;
                if (type.includes('rfq') && p.email_rfqs) shouldEmail = true;

                if (shouldEmail) {
                    const user = await this.db.query('SELECT email, name FROM users WHERE id = $1', [userId]);
                    if (user.rows.length > 0) {
                        await this.emailService.sendEmail(
                            user.rows[0].email,
                            `JairoApp: ${title}`,
                            `<h2>Hola ${user.rows[0].name}</h2><p>${message}</p>`
                        );
                    }
                }
            }

            return result.rows[0];
        } catch (error) {
            this.logger.error('Error creating notification', error);
            throw error;
        }
    }

    async getNotifications(token: string) {
        const user = this.getUserFromToken(token);

        const result = await this.db.query(`
            SELECT *
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 100
        `, [user.id]);

        return { notificaciones: result.rows };
    }

    async markAsRead(id: string, token: string) {
        const user = this.getUserFromToken(token);

        await this.db.query(
            'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
            [id, user.id]
        );
        return { success: true };
    }

    async markAllAsRead(token: string) {
        const user = this.getUserFromToken(token);

        await this.db.query(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
            [user.id]
        );
        return { success: true };
    }

    async getUnreadCount(token: string) {
        const user = this.getUserFromToken(token);

        const result = await this.db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
            [user.id]
        );
        return { unread: parseInt(result.rows[0].count) };
    }

    async updatePreferences(token: string, prefs: any) {
        const user = this.getUserFromToken(token);

        await this.db.query(`
            INSERT INTO notification_preferences (user_id, email_connections, email_messages, email_rfqs, push_enabled)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET
                email_connections = COALESCE($2, notification_preferences.email_connections),
                email_messages = COALESCE($3, notification_preferences.email_messages),
                email_rfqs = COALESCE($4, notification_preferences.email_rfqs),
                push_enabled = COALESCE($5, notification_preferences.push_enabled),
                updated_at = NOW()
        `, [
            user.id,
            prefs.emailConnections ?? true,
            prefs.emailMessages ?? true,
            prefs.emailRfqs ?? true,
            prefs.pushEnabled ?? true
        ]);

        return { mensaje: 'Preferencias actualizadas' };
    }
}
