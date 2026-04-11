import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../core/email/email.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CompaniesService {
    private readonly logger = new Logger(CompaniesService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly emailService: EmailService
    ) { }

    // Helper to validate UUID format
    private isValidUUID(str: string | undefined | null): boolean {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    async findAll(filters: { sector?: string; tipo?: string; estado?: string; busqueda?: string }) {
        let query = `
            SELECT 
              c.*,
              s.name as sector_nombre,
              ct.name as tipo_nombre,
              (SELECT COUNT(*) FROM company_relationships WHERE company_a_id = c.id OR company_b_id = c.id) as conexiones
            FROM companies c
            LEFT JOIN sectors s ON c.sector_id = s.id
            LEFT JOIN company_types ct ON c.type_id = ct.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.busqueda) {
            query += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
            params.push(`%${filters.busqueda}%`);
            paramIndex++;
        }

        if (filters.sector) {
            query += ` AND s.name = $${paramIndex}`;
            params.push(filters.sector);
            paramIndex++;
        }

        if (filters.estado) {
            query += ` AND c.status = $${paramIndex}`;
            params.push(filters.estado);
            paramIndex++;
        }

        query += ` ORDER BY c.created_at DESC`;

        const result = await this.db.query(query, params);
        return { empresas: result.rows, total: result.rowCount };
    }

    async findOne(id: string) {
        const result = await this.db.query(`
            SELECT 
              c.*,
              s.name as sector_nombre,
              ct.name as tipo_nombre
            FROM companies c
            LEFT JOIN sectors s ON c.sector_id = s.id
            LEFT JOIN company_types ct ON c.type_id = ct.id
            WHERE c.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            throw new NotFoundException('Empresa no encontrada');
        }

        return result.rows[0];
    }

    async create(data: any) {
        const pool = this.db.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const slug = data.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            // Validate UUIDs - if not valid UUID format, set to null
            const validSectorId = this.isValidUUID(data.sectorId) ? data.sectorId : null;
            const validTypeId = this.isValidUUID(data.tipoId) ? data.tipoId : null;

            const companyResult = await client.query(`
                INSERT INTO companies (name, slug, email, phone, address, website, sector_id, type_id, logo, descripcion, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
                RETURNING *
            `, [
                data.nombre,
                slug,
                data.email,
                data.telefono,
                data.direccion,
                data.website,
                validSectorId,
                validTypeId,
                data.logo || null,
                data.descripcion || null
            ]);

            const company = companyResult.rows[0];

            if (data.password) {
                const hashedPassword = await bcrypt.hash(data.password, 10);
                const userName = data.nombreContacto || data.nombre;

                await client.query(`
                    INSERT INTO users (email, password, name, role, company_id)
                    VALUES ($1, $2, $3, 'admin', $4)
                `, [data.email, hashedPassword, userName, company.id]);

                this.logger.log(`👤 Usuario admin creado para: ${data.email}`);
            }

            await client.query('COMMIT');

            await this.registrarActividad('nueva_empresa', company.id, `Nueva empresa registrada: ${data.nombre}`);

            this.emailService.sendWelcomeEmail(data.email, data.nombreContacto || data.nombre).catch(err =>
                this.logger.warn('No se pudo enviar email de bienvenida:', err)
            );

            this.logger.log(`✅ Empresa creada: ${data.nombre}`);
            return {
                ...company,
                mensaje: 'Empresa registrada exitosamente. Recibirás un email cuando sea aprobada.'
            };
        } catch (error: any) {
            await client.query('ROLLBACK');
            this.logger.error('Error creando empresa:', error);
            // Rethrow with proper HTTP exception for better frontend handling
            if (error.code === '23505') {
                throw new HttpException('Esta empresa ya está registrada', HttpStatus.CONFLICT);
            }
            throw new HttpException(
                error.message || 'Error al registrar empresa',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        } finally {
            client.release();
        }
    }

    async update(id: string, data: any) {
        const result = await this.db.query(`
            UPDATE companies 
            SET name = COALESCE($2, name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                address = COALESCE($5, address),
                website = COALESCE($6, website),
                sector_id = COALESCE($7, sector_id),
                type_id = COALESCE($8, type_id),
                status = COALESCE($9, status),
                logo = COALESCE($10, logo),
                descripcion = COALESCE($11, descripcion),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, data.nombre, data.email, data.telefono, data.direccion, data.website, data.sectorId, data.tipoId, data.estado, data.logo, data.descripcion]);

        return result.rows[0];
    }

    async remove(id: string) {
        await this.db.query('DELETE FROM company_relationships WHERE company_a_id = $1 OR company_b_id = $1', [id]);
        await this.db.query('DELETE FROM companies WHERE id = $1', [id]);
        return { mensaje: 'Empresa eliminada exitosamente' };
    }

    async solicitarConexion(empresaOrigenId: string, empresaDestinoId: string, tipo: string) {
        const result = await this.db.query(`
            INSERT INTO company_relationships (company_a_id, company_b_id, relationship_type, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *
        `, [empresaOrigenId, empresaDestinoId, tipo]);

        await this.registrarActividad('solicitud_conexion', empresaOrigenId, `Solicitud de conexión enviada`);

        return result.rows[0];
    }

    async getConexiones(empresaId: string) {
        const result = await this.db.query(`
            SELECT 
              cr.*,
              ca.name as empresa_origen_nombre,
              cb.name as empresa_destino_nombre
            FROM company_relationships cr
            JOIN companies ca ON cr.company_a_id = ca.id
            JOIN companies cb ON cr.company_b_id = cb.id
            WHERE cr.company_a_id = $1 OR cr.company_b_id = $1
        `, [empresaId]);

        return result.rows;
    }

    private async registrarActividad(tipo: string, empresaId: string, descripcion: string) {
        try {
            await this.db.query(`
                INSERT INTO activities (type, company_id, description) VALUES ($1, $2, $3)
            `, [tipo, empresaId, descripcion]);
        } catch (error) {
            this.logger.warn('No se pudo registrar actividad:', error);
        }
    }
}
