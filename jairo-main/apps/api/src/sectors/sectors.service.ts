import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SectorsService {
    private readonly logger = new Logger(SectorsService.name);

    constructor(private readonly db: DatabaseService) { }

    async findAll() {
        const result = await this.db.query(`
            SELECT 
              s.*,
              (SELECT COUNT(*) FROM companies WHERE sector_id = s.id) as total_empresas
            FROM sectors s
            ORDER BY s.name ASC
        `);
        return { sectores: result.rows };
    }

    async findOne(id: string) {
        const result = await this.db.query('SELECT * FROM sectors WHERE id = $1', [id]);
        return result.rows[0];
    }

    async create(data: any) {
        const result = await this.db.query(`
            INSERT INTO sectors (name, description, icon, color)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [data.nombre, data.descripcion, data.icono, data.color]);

        this.logger.log(`✅ Sector creado: ${data.nombre}`);
        return result.rows[0];
    }

    async update(id: string, data: any) {
        const result = await this.db.query(`
            UPDATE sectors 
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                icon = COALESCE($4, icon),
                color = COALESCE($5, color)
            WHERE id = $1
            RETURNING *
        `, [id, data.nombre, data.descripcion, data.icono, data.color]);
        return result.rows[0];
    }

    async remove(id: string) {
        await this.db.query('DELETE FROM sectors WHERE id = $1', [id]);
        return { mensaje: 'Sector eliminado exitosamente' };
    }

    async getTiposBySector(sectorId: string) {
        const result = await this.db.query(`
            SELECT * FROM company_types WHERE sector_id = $1 ORDER BY name ASC
        `, [sectorId]);
        return { tipos: result.rows };
    }
}
