import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@repo/database/schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;
    private db: ReturnType<typeof drizzle>;
    private readonly logger = new Logger(DatabaseService.name);

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Initialize Drizzle ORM
        this.db = drizzle(this.pool, { schema });

        this.pool.on('error', (err) => {
            this.logger.error('Unexpected error on idle client', err);
        });
    }

    async onModuleInit() {
        try {
            this.logger.log('Connecting to database...');
            const client = await this.pool.connect();
            try {
                const res = await client.query('SELECT NOW()');
                this.logger.log('✅ Database connected successfully: ' + res.rows[0].now);
            } finally {
                client.release();
            }
        } catch (e: any) {
            this.logger.error('❌ Failed to connect to database', e.stack);
        }
    }

    async onModuleDestroy() {
        await this.pool.end();
        this.logger.log('Database connection pool closed');
    }

    // Modern Drizzle Access (Prefer this for new code)
    get drizzle() {
        return this.db;
    }

    // Legacy Raw SQL Access
    async query(text: string, params?: any[]) {
        try {
            const res = await this.pool.query(text, params);
            return res;
        } catch (error) {
            this.logger.error(`Query failed: ${text}`, error);
            throw error;
        }
    }

    getPool(): Pool {
        return this.pool;
    }
}
