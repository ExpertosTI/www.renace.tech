import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly db: DatabaseService) { }

    async findAll(filters: { empresaId?: string; rol?: string; busqueda?: string }) {
        let query = `
            SELECT u.id, u.email, u.name, u.role, u.avatar, u.created_at,
                   c.name as empresa_nombre
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.busqueda) {
            query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
            params.push(`%${filters.busqueda}%`);
            paramIndex++;
        }

        if (filters.empresaId) {
            query += ` AND u.company_id = $${paramIndex}`;
            params.push(filters.empresaId);
            paramIndex++;
        }

        if (filters.rol) {
            query += ` AND u.role = $${paramIndex}`;
            params.push(filters.rol);
            paramIndex++;
        }

        query += ` ORDER BY u.created_at DESC`;

        const result = await this.db.query(query, params);
        return { usuarios: result.rows, total: result.rowCount };
    }

    async findOne(id: string) {
        const result = await this.db.query(`
            SELECT u.id, u.email, u.name, u.role, u.avatar, u.created_at,
                   c.name as empresa_nombre, c.id as empresa_id
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        }

        return result.rows[0];
    }

    async create(data: any) {
        const hashedPassword = await bcrypt.hash(data.password || 'TempPass123!', 10);

        const result = await this.db.query(`
            INSERT INTO users (email, password, name, role, company_id, avatar)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, name, role, created_at
        `, [
            data.email.toLowerCase(),
            hashedPassword,
            data.nombre,
            data.rol || 'user',
            data.empresaId || null,
            data.avatar || null
        ]);

        this.logger.log(`✅ Usuario creado: ${data.email}`);
        return result.rows[0];
    }

    async update(id: string, data: any) {
        const result = await this.db.query(`
            UPDATE users 
            SET name = COALESCE($2, name),
                avatar = COALESCE($3, avatar),
                company_id = COALESCE($4, company_id)
            WHERE id = $1
            RETURNING id, email, name, role
        `, [id, data.nombre, data.avatar, data.empresaId]);

        return result.rows[0];
    }

    async remove(id: string) {
        await this.db.query('DELETE FROM users WHERE id = $1', [id]);
        return { mensaje: 'Usuario eliminado exitosamente' };
    }

    async cambiarRol(id: string, nuevoRol: string) {
        const rolesValidos = ['super_admin', 'admin', 'manager', 'user'];
        if (!rolesValidos.includes(nuevoRol)) {
            throw new HttpException('Rol inválido', HttpStatus.BAD_REQUEST);
        }

        const result = await this.db.query(
            'UPDATE users SET role = $2 WHERE id = $1 RETURNING id, email, role',
            [id, nuevoRol]
        );
        return result.rows[0];
    }

    async asignarEmpresa(userId: string, empresaId: string) {
        const result = await this.db.query(
            'UPDATE users SET company_id = $2 WHERE id = $1 RETURNING id, email, company_id',
            [userId, empresaId]
        );
        return result.rows[0];
    }

    async completeOnboarding(userId: string, data: any) {
        const pool = this.db.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let sectorId = null;
            if (data.sector) {
                const sectorRes = await client.query('SELECT id FROM sectors WHERE name ILIKE $1 LIMIT 1', [data.sector]);
                if (sectorRes.rows.length > 0) sectorId = sectorRes.rows[0].id;
                else {
                    const defaultSector = await client.query('SELECT id FROM sectors LIMIT 1');
                    if (defaultSector.rows.length > 0) sectorId = defaultSector.rows[0].id;
                }
            }

            let typeId = null;
            if (data.tipoEmpresa) {
                const typeRes = await client.query('SELECT id FROM company_types WHERE name ILIKE $1 LIMIT 1', [data.tipoEmpresa]);
                if (typeRes.rows.length > 0) typeId = typeRes.rows[0].id;
                else {
                    const defaultType = await client.query('SELECT id FROM company_types LIMIT 1');
                    if (defaultType.rows.length > 0) typeId = defaultType.rows[0].id;
                }
            }

            const slug = data.empresaNombre.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

            const companyRes = await client.query(`
                INSERT INTO companies (name, slug, description, sector_id, type_id, website, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'active')
                RETURNING id
            `, [
                data.empresaNombre,
                slug,
                data.empresaDescripcion,
                sectorId,
                typeId,
                data.website
            ]);
            const companyId = companyRes.rows[0].id;

            await client.query(`
                UPDATE users 
                SET name = COALESCE($2, name),
                    phone = COALESCE($3, phone),
                    job_title = COALESCE($4, job_title),
                    company_id = $5,
                    role = 'admin'
                WHERE id = $1
            `, [
                userId,
                data.nombre,
                data.telefono,
                data.cargo,
                companyId
            ]);

            await client.query('COMMIT');

            return {
                message: 'Onboarding completado',
                companyId: companyId,
                user: {
                    id: userId,
                    name: data.nombre,
                    role: 'admin'
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error('Error in completeOnboarding', error);
            throw new HttpException('Error al completar onboarding', HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            client.release();
        }
    }

    // Vincula un usuario a una empresa si el email del usuario coincide con el email de la empresa
    async claimCompanyByEmail(userId: string) {
        // Get user email
        const userRes = await this.db.query('SELECT email, company_id FROM users WHERE id = $1', [userId]);

        if (!userRes.rows[0]) {
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        }

        const user = userRes.rows[0];

        // If user already has a company, return info
        if (user.company_id) {
            const companyRes = await this.db.query('SELECT id, name FROM companies WHERE id = $1', [user.company_id]);
            return {
                linked: true,
                company: companyRes.rows[0],
                message: 'Ya tienes una empresa vinculada'
            };
        }

        // Find company with matching email (case insensitive)
        const companyRes = await this.db.query(
            'SELECT id, name, status FROM companies WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [user.email]
        );

        if (!companyRes.rows[0]) {
            throw new HttpException(
                'No se encontró una empresa registrada con tu email. Puedes registrar una nueva empresa en la página de registro.',
                HttpStatus.NOT_FOUND
            );
        }

        const company = companyRes.rows[0];

        // Link user to company
        await this.db.query(
            'UPDATE users SET company_id = $1, role = $2 WHERE id = $3',
            [company.id, 'admin', userId]
        );

        this.logger.log(`✅ Usuario ${user.email} vinculado a empresa ${company.name}`);

        return {
            linked: true,
            company: {
                id: company.id,
                name: company.name,
                status: company.status
            },
            message: `¡Cuenta vinculada exitosamente a ${company.name}!`
        };
    }
}
