
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);
    private readonly jwtSecret = process.env.JWT_SECRET;
    private initialized = false;

    constructor(private readonly db: DatabaseService) {
        this.initTables();
    }

    private async initTables() {
        if (this.initialized) return;
        try {
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS conversations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    participant1_id UUID NOT NULL,
                    participant2_id UUID NOT NULL,
                    last_message_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(participant1_id, participant2_id)
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    conversation_id UUID REFERENCES conversations(id),
                    sender_id UUID NOT NULL,
                    content TEXT NOT NULL,
                    read_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);
            `);
            this.logger.log('✅ Messages tables initialized');
            this.initialized = true;
        } catch (error) {
            this.logger.warn('Messages tables check failed (safe to ignore if concurrent)', error);
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

    async getConversations(token: string) {
        const user = this.getUserFromToken(token);

        try {
            const result = await this.db.query(`
                SELECT 
                    c.id,
                    c.last_message_at,
                    CASE 
                        WHEN c.participant1_id = $1 THEN c.participant2_id 
                        ELSE c.participant1_id 
                    END as other_user_id,
                    u.name as other_user_name,
                    u.avatar as other_user_avatar,
                    comp.name as other_company_name,
                    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL) as unread_count
                FROM conversations c
                JOIN users u ON u.id = CASE WHEN c.participant1_id = $1 THEN c.participant2_id ELSE c.participant1_id END
                LEFT JOIN companies comp ON u.company_id = comp.id
                WHERE c.participant1_id = $1 OR c.participant2_id = $1
                ORDER BY c.last_message_at DESC
            `, [user.id]);

            return { conversaciones: result.rows };
        } catch (error) {
            this.logger.error('Error getting conversations', error);
            throw new HttpException('Error al obtener conversaciones', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getMessages(conversationId: string, token: string, page: number = 1) {
        const user = this.getUserFromToken(token);
        const limit = 50;
        const offset = (page - 1) * limit;

        try {
            // Verify user is participant
            const conv = await this.db.query(
                'SELECT * FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
                [conversationId, user.id]
            );
            if (conv.rows.length === 0) {
                throw new HttpException('Conversación no encontrada', HttpStatus.NOT_FOUND);
            }

            const result = await this.db.query(`
                SELECT 
                    m.*,
                    u.name as sender_name,
                    u.avatar as sender_avatar
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                WHERE m.conversation_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `, [conversationId, limit, offset]);

            return {
                mensajes: result.rows.reverse(),
                pagina: page,
                limite: limit
            };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Error getting messages', error);
            throw new HttpException('Error al obtener mensajes', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async sendMessage(token: string, content: string, recipientId?: string, conversationId?: string) {
        const user = this.getUserFromToken(token);
        const client = await this.db.getPool().connect();

        try {
            await client.query('BEGIN');

            // Find or create conversation
            let convId = conversationId;
            if (!convId) {
                if (!recipientId) {
                    throw new HttpException('Se requiere recipientId para nueva conversación', HttpStatus.BAD_REQUEST);
                }
                const existing = await client.query(`
                    SELECT id FROM conversations 
                    WHERE (participant1_id = $1 AND participant2_id = $2) 
                       OR (participant1_id = $2 AND participant2_id = $1)
                `, [user.id, recipientId]);

                if (existing.rows.length > 0) {
                    convId = existing.rows[0].id;
                } else {
                    const newConv = await client.query(`
                        INSERT INTO conversations (participant1_id, participant2_id)
                        VALUES ($1, $2) RETURNING id
                    `, [user.id, recipientId]);
                    convId = newConv.rows[0].id;
                }
            }

            // Insert message
            const message = await client.query(`
                INSERT INTO messages (conversation_id, sender_id, content)
                VALUES ($1, $2, $3) RETURNING *
            `, [convId, user.id, content]);

            // Update conversation last_message_at
            await client.query(
                'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
                [convId]
            );

            await client.query('COMMIT');

            this.logger.log(`📨 Mensaje enviado de ${user.id} a ${recipientId}`);

            return {
                mensaje: message.rows[0],
                conversationId: convId
            };
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof HttpException) throw error;
            this.logger.error('Error sending message', error);
            throw new HttpException('Error al enviar mensaje', HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            client.release();
        }
    }

    async markAsRead(conversationId: string, token: string) {
        const user = this.getUserFromToken(token);

        try {
            await this.db.query(`
                UPDATE messages 
                SET read_at = NOW() 
                WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL
            `, [conversationId, user.id]);

            return { success: true };
        } catch (error) {
            this.logger.error('Error marking as read', error);
            throw new HttpException('Error al marcar leído', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getUnreadCount(token: string) {
        const user = this.getUserFromToken(token);

        try {
            const result = await this.db.query(`
                SELECT COUNT(*) as count
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE (c.participant1_id = $1 OR c.participant2_id = $1)
                  AND m.sender_id != $1 
                  AND m.read_at IS NULL
            `, [user.id]);

            return { unread: parseInt(result.rows[0].count) };
        } catch (error) {
            this.logger.error('Error getting unread count', error);
            throw new HttpException('Error al obtener no leídos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
