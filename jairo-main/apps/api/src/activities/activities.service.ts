import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ActivitiesService {
    private readonly logger = new Logger(ActivitiesService.name);

    constructor(private readonly db: DatabaseService) { }

    async findAll(limite: number = 20) {
        const result = await this.db.query(`
            SELECT 
              a.*,
              c.name as empresa_nombre,
              c.logo as empresa_logo
            FROM activities a
            LEFT JOIN companies c ON a.company_id = c.id
            ORDER BY a.created_at DESC
            LIMIT $1
        `, [limite]);
        return { actividades: result.rows };
    }

    async getRecientes() {
        return this.findAll(10);
    }

    async create(tipo: string, empresaId: string | null, descripcion: string) {
        const result = await this.db.query(`
            INSERT INTO activities (type, company_id, description)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [tipo, empresaId, descripcion]);
        return result.rows[0];
    }
}
