
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);
    private readonly jwtSecret = process.env.JWT_SECRET;
    private initialized = false;

    constructor(private readonly db: DatabaseService) {
        this.initTables();
    }

    private async initTables() {
        if (this.initialized) return;
        try {
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS products (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id UUID NOT NULL,
                    name VARCHAR(300) NOT NULL,
                    description TEXT,
                    sku VARCHAR(100),
                    price DECIMAL(15,2),
                    min_order_qty INTEGER DEFAULT 1,
                    images TEXT[],
                    category_id UUID,
                    status VARCHAR(50) DEFAULT 'active',
                    views INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS product_categories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(200) NOT NULL,
                    parent_id UUID,
                    icon VARCHAR(50),
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
                CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
                CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
            `);
            this.logger.log('✅ Products tables initialized');
            this.initialized = true;
        } catch (error) {
            this.logger.warn('Products tables check failed (safe to ignore if concurrent)', error);
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

    async listProducts(filters: any, page: number = 1) {
        const limit = 24;
        const offset = (page - 1) * limit;

        try {
            let query = `
                SELECT 
                    p.*,
                    c.name as company_name,
                    c.slug as company_slug,
                    cat.name as category_name
                FROM products p
                LEFT JOIN companies c ON p.company_id = c.id
                LEFT JOIN product_categories cat ON p.category_id = cat.id
                WHERE p.status = 'active'
            `;
            const params: any[] = [];

            if (filters.companyId) {
                query += ` AND p.company_id = $${params.length + 1}`;
                params.push(filters.companyId);
            }

            if (filters.busqueda) {
                query += ` AND (p.name ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1})`;
                params.push(`%${filters.busqueda}%`);
            }

            if (filters.minPrice) {
                query += ` AND p.price >= $${params.length + 1}`;
                params.push(filters.minPrice);
            }

            if (filters.maxPrice) {
                query += ` AND p.price <= $${params.length + 1}`;
                params.push(filters.maxPrice);
            }

            if (filters.categoryId) {
                query += ` AND (p.category_id = $${params.length + 1} OR cat.parent_id = $${params.length + 1})`;
                params.push(filters.categoryId);
            }

            // Ordenamiento
            if (filters.sort === 'price_asc') {
                query += ' ORDER BY p.price ASC';
            } else if (filters.sort === 'price_desc') {
                query += ' ORDER BY p.price DESC';
            } else if (filters.sort === 'newest') {
                query += ' ORDER BY p.created_at DESC';
            } else {
                query += ' ORDER BY p.views DESC NULLS LAST, p.created_at DESC';
            }

            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result = await this.db.query(query, params);

            // Total count for pagination
            const countQuery = `SELECT COUNT(*) FROM products p WHERE p.status = 'active'`;
            const countRes = await this.db.query(countQuery);

            return {
                data: result.rows,
                meta: {
                    total: parseInt(countRes.rows[0].count),
                    page,
                    last_page: Math.ceil(parseInt(countRes.rows[0].count) / limit)
                }
            };
        } catch (error) {
            this.logger.error('Error listing products', error);
            throw new HttpException('Error al obtener productos', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getProduct(id: string) {
        try {
            await this.db.query('UPDATE products SET views = COALESCE(views, 0) + 1 WHERE id = $1', [id]);

            const result = await this.db.query(`
                SELECT 
                    p.*,
                    c.name as company_name,
                    c.slug as company_slug,
                    c.logo as company_logo,
                    c.verified as company_verified,
                    cat.name as category_name
                FROM products p
                LEFT JOIN companies c ON p.company_id = c.id
                LEFT JOIN product_categories cat ON p.category_id = cat.id
                WHERE p.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
            }

            return result.rows[0];
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error(`Error getting product ${id}`, error);
            throw new HttpException('Error al obtener producto', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createProduct(token: string, data: any) {
        const user = this.getUserFromToken(token);
        // Validar si tiene empresa
        const userCheck = await this.db.query('SELECT company_id FROM users WHERE id = $1', [user.id]);

        if (!userCheck.rows[0]?.company_id) {
            throw new HttpException('Debes pertenecer a una empresa para publicar productos', HttpStatus.FORBIDDEN);
        }

        const companyId = userCheck.rows[0].company_id;

        try {
            const result = await this.db.query(`
                INSERT INTO products (
                    company_id, name, description, sku, price, 
                    min_order_qty, images, category_id, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
                RETURNING *
            `, [
                companyId,
                data.name,
                data.description,
                data.sku,
                data.price,
                data.minOrderQty || 1,
                data.images || [],
                data.categoryId
            ]);

            return result.rows[0];
        } catch (error) {
            this.logger.error('Error creating product', error);
            throw new HttpException('Error al crear producto', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateProduct(id: string, token: string, data: any) {
        const user = this.getUserFromToken(token);

        // Verificar propiedad
        const check = await this.db.query(
            'SELECT company_id FROM products WHERE id = $1',
            [id]
        );

        if (check.rows.length === 0) {
            throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
        }

        // Verificar que el usuario pertenezca a la empresa dueña del producto
        const userComp = await this.db.query('SELECT company_id FROM users WHERE id = $1', [user.id]);

        if (userComp.rows[0]?.company_id !== check.rows[0].company_id) {
            throw new HttpException('No tienes permiso para editar este producto', HttpStatus.FORBIDDEN);
        }

        try {
            // Construir query dinámico
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            const allowed = ['name', 'description', 'price', 'sku', 'images', 'min_order_qty', 'status'];

            for (const key of Object.keys(data)) {
                if (allowed.includes(key)) {
                    fields.push(`${key} = $${idx}`);
                    values.push(data[key]);
                    idx++;
                }
            }

            if (fields.length === 0) return { message: 'Nada que actualizar' };

            values.push(id);
            const query = `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;

            const result = await this.db.query(query, values);
            return result.rows[0];
        } catch (error) {
            this.logger.error(`Error updating product ${id}`, error);
            throw new HttpException('Error al actualizar producto', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteProduct(id: string, token: string) {
        const user = this.getUserFromToken(token);

        const check = await this.db.query('SELECT company_id FROM products WHERE id = $1', [id]);
        if (check.rows.length === 0) throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);

        const userComp = await this.db.query('SELECT company_id FROM users WHERE id = $1', [user.id]);
        if (userComp.rows[0]?.company_id !== check.rows[0].company_id) {
            throw new HttpException('No tienes permiso', HttpStatus.FORBIDDEN);
        }

        await this.db.query('DELETE FROM products WHERE id = $1', [id]);
        return { message: 'Producto eliminado' };
    }

    async getMyCatalog(token: string) {
        const user = this.getUserFromToken(token);
        const userCheck = await this.db.query('SELECT company_id FROM users WHERE id = $1', [user.id]);

        if (!userCheck.rows[0]?.company_id) {
            return { data: [], meta: { total: 0 } };
        }

        const companyId = userCheck.rows[0].company_id;
        const result = await this.db.query(`
            SELECT p.*, cat.name as category_name
            FROM products p
            LEFT JOIN product_categories cat ON p.category_id = cat.id
            WHERE p.company_id = $1
            ORDER BY p.created_at DESC
        `, [companyId]);

        return { data: result.rows, meta: { total: result.rowCount } };
    }

    async importProducts(token: string, products: any[]) {
        const user = this.getUserFromToken(token);
        const userCheck = await this.db.query('SELECT company_id FROM users WHERE id = $1', [user.id]);

        if (!userCheck.rows[0]?.company_id) {
            throw new HttpException('Debes pertenecer a una empresa para importar productos', HttpStatus.FORBIDDEN);
        }

        const companyId = userCheck.rows[0].company_id;
        const imported: any[] = [];
        const errors: any[] = [];

        for (const product of products) {
            try {
                const result = await this.db.query(`
                    INSERT INTO products (company_id, name, description, sku, price, min_order_qty, status)
                    VALUES ($1, $2, $3, $4, $5, $6, 'active')
                    RETURNING id, name
                `, [
                    companyId,
                    product.name || product.nombre,
                    product.description || product.descripcion,
                    product.sku,
                    product.price || product.precio,
                    product.minOrderQty || product.cantidad_minima || 1
                ]);
                imported.push(result.rows[0]);
            } catch (error) {
                errors.push({ product: product.name || product.nombre, error: 'Error al importar' });
            }
        }

        return { imported: imported.length, errors: errors.length, details: { imported, errors } };
    }

    async getCategories() {
        const result = await this.db.query('SELECT * FROM product_categories ORDER BY name ASC');
        return result.rows;
    }
}

