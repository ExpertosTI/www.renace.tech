import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RelationshipsService {
    private readonly logger = new Logger(RelationshipsService.name);

    constructor(private readonly db: DatabaseService) { }

    async findAll(filters: { empresaId?: string; tipo?: string; estado?: string }) {
        let query = `
            SELECT 
              cr.*,
              ca.name as empresa_origen_nombre,
              ca.logo as empresa_origen_logo,
              cb.name as empresa_destino_nombre,
              cb.logo as empresa_destino_logo,
              sa.name as sector_origen,
              sb.name as sector_destino
            FROM company_relationships cr
            JOIN companies ca ON cr.company_a_id = ca.id
            JOIN companies cb ON cr.company_b_id = cb.id
            LEFT JOIN sectors sa ON ca.sector_id = sa.id
            LEFT JOIN sectors sb ON cb.sector_id = sb.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.empresaId) {
            query += ` AND (cr.company_a_id = $${paramIndex} OR cr.company_b_id = $${paramIndex})`;
            params.push(filters.empresaId);
            paramIndex++;
        }

        if (filters.tipo) {
            query += ` AND cr.relationship_type = $${paramIndex}`;
            params.push(filters.tipo);
            paramIndex++;
        }

        if (filters.estado) {
            query += ` AND cr.status = $${paramIndex}`;
            params.push(filters.estado);
            paramIndex++;
        }

        query += ` ORDER BY cr.created_at DESC`;

        const result = await this.db.query(query, params);
        return { relaciones: result.rows, total: result.rowCount };
    }

    async findOne(id: string) {
        const result = await this.db.query(`
            SELECT 
              cr.*,
              ca.name as empresa_origen_nombre,
              cb.name as empresa_destino_nombre
            FROM company_relationships cr
            JOIN companies ca ON cr.company_a_id = ca.id
            JOIN companies cb ON cr.company_b_id = cb.id
            WHERE cr.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            throw new HttpException('Relación no encontrada', HttpStatus.NOT_FOUND);
        }

        return result.rows[0];
    }

    async create(data: {
        empresaOrigenId: string;
        empresaDestinoId: string;
        tipo: string;
        notas?: string;
    }) {
        const existing = await this.db.query(`
            SELECT id FROM company_relationships 
            WHERE (company_a_id = $1 AND company_b_id = $2) 
               OR (company_a_id = $2 AND company_b_id = $1)
        `, [data.empresaOrigenId, data.empresaDestinoId]);

        if (existing.rows.length > 0) {
            throw new HttpException('Ya existe una conexión entre estas empresas', HttpStatus.CONFLICT);
        }

        const result = await this.db.query(`
            INSERT INTO company_relationships (company_a_id, company_b_id, relationship_type, notes, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
        `, [data.empresaOrigenId, data.empresaDestinoId, data.tipo, data.notas || null]);

        await this.registrarActividad('nueva_conexion', data.empresaOrigenId, 'Nueva solicitud de conexión enviada');

        this.logger.log(`✅ Conexión creada entre empresas`);
        return result.rows[0];
    }

    async cambiarEstado(id: string, nuevoEstado: string) {
        const result = await this.db.query(
            'UPDATE company_relationships SET status = $2 WHERE id = $1 RETURNING *',
            [id, nuevoEstado]
        );

        if (result.rows.length === 0) {
            throw new HttpException('Relación no encontrada', HttpStatus.NOT_FOUND);
        }

        const accion = nuevoEstado === 'active' ? 'aprobada' : 'rechazada';
        await this.registrarActividad(`conexion_${accion}`, null, `Conexión ${accion}`);

        return result.rows[0];
    }

    async remove(id: string) {
        await this.db.query('DELETE FROM company_relationships WHERE id = $1', [id]);
        return { mensaje: 'Conexión eliminada exitosamente' };
    }

    async getByEmpresa(empresaId: string) {
        const result = await this.db.query(`
            SELECT 
              cr.*,
              CASE 
                WHEN cr.company_a_id = $1 THEN cb.name
                ELSE ca.name
              END as empresa_conectada_nombre,
              CASE 
                WHEN cr.company_a_id = $1 THEN cb.logo
                ELSE ca.logo
              END as empresa_conectada_logo,
              CASE 
                WHEN cr.company_a_id = $1 THEN cb.id
                ELSE ca.id
              END as empresa_conectada_id
            FROM company_relationships cr
            JOIN companies ca ON cr.company_a_id = ca.id
            JOIN companies cb ON cr.company_b_id = cb.id
            WHERE cr.company_a_id = $1 OR cr.company_b_id = $1
            ORDER BY cr.created_at DESC
        `, [empresaId]);

        return { conexiones: result.rows };
    }

    async getEstadisticas() {
        const stats = await this.db.query(`
            SELECT 
              COUNT(*) FILTER (WHERE status = 'active') as activas,
              COUNT(*) FILTER (WHERE status = 'pending') as pendientes,
              COUNT(*) FILTER (WHERE status = 'rejected') as rechazadas,
              COUNT(*) as total
            FROM company_relationships
        `);

        const porTipo = await this.db.query(`
            SELECT relationship_type as tipo, COUNT(*) as cantidad
            FROM company_relationships
            WHERE status = 'active'
            GROUP BY relationship_type
        `);

        return {
            resumen: stats.rows[0],
            porTipo: porTipo.rows
        };
    }

    private async registrarActividad(tipo: string, empresaId: string | null, descripcion: string) {
        try {
            await this.db.query(
                'INSERT INTO activities (type, company_id, description) VALUES ($1, $2, $3)',
                [tipo, empresaId, descripcion]
            );
        } catch (error) {
            this.logger.warn('No se pudo registrar actividad');
        }
    }
}
