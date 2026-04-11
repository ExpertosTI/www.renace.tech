import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(private readonly db: DatabaseService) { }

    async onModuleInit() {
        await this.initDatabase();
        await this.createSuperAdmins();
    }

    async initDatabase() {
        try {
            // Crear enums si no existen
            await this.db.query(`
                DO $$ BEGIN
                    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'user');
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            `);

            await this.db.query(`
                DO $$ BEGIN
                    CREATE TYPE company_status AS ENUM ('active', 'pending', 'suspended');
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            `);

            await this.db.query(`
                DO $$ BEGIN
                    CREATE TYPE relationship_type AS ENUM ('proveedor', 'cliente', 'socio', 'distribuidor');
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            `);

            await this.db.query(`
                DO $$ BEGIN
                    CREATE TYPE relationship_status AS ENUM ('active', 'pending', 'rejected');
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            `);

            // Tabla de usuarios
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(200),
                    role user_role DEFAULT 'user',
                    company_id UUID,
                    avatar VARCHAR(500),
                    phone VARCHAR(20),
                    job_title VARCHAR(100),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Migration for existing tables
            await this.db.query(`
                DO $$ BEGIN
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
                EXCEPTION WHEN duplicate_column THEN null;
                END $$;
            `);
            await this.db.query(`
                DO $$ BEGIN
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
                EXCEPTION WHEN duplicate_column THEN null;
                END $$;
            `);

            // Tabla de sectores
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS sectors (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    icon VARCHAR(50),
                    color VARCHAR(7),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Tabla de tipos de empresa
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS company_types (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    sector_id UUID REFERENCES sectors(id),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Tabla de empresas
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS companies (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(200) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    logo VARCHAR(500),
                    sector_id UUID REFERENCES sectors(id),
                    type_id UUID REFERENCES company_types(id),
                    address TEXT,
                    phone VARCHAR(20),
                    email VARCHAR(100),
                    website VARCHAR(200),
                    rnc VARCHAR(20),
                    descripcion TEXT,
                    status company_status DEFAULT 'pending',
                    stripe_customer_id VARCHAR(255),
                    subscription_id VARCHAR(255),
                    subscription_status VARCHAR(50) DEFAULT 'free',
                    plan VARCHAR(50) DEFAULT 'free',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Migration for existing tables
            await this.db.query(`
                DO $$ BEGIN
                    ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
                EXCEPTION WHEN duplicate_column THEN null;
                END $$;
            `);
            await this.db.query(`
                DO $$ BEGIN
                    ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
                EXCEPTION WHEN duplicate_column THEN null;
                END $$;
            `);
            await this.db.query(`
                DO $$ BEGIN
                    ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free';
                EXCEPTION WHEN duplicate_column THEN null;
                END $$;
            `);
            await this.db.query(`
                DO $$ BEGIN
                    ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
                EXCEPTION WHEN duplicate_column THEN null;
                END $$;
            `);

            // Tabla de relaciones entre empresas
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS company_relationships (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_a_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    company_b_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    relationship_type relationship_type NOT NULL,
                    status relationship_status DEFAULT 'pending',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Tabla de actividades (feed)
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS activities (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    type VARCHAR(50) NOT NULL,
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    description TEXT NOT NULL,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            this.logger.log('✅ Base de datos inicializada');

            // Seed de sectores de República Dominicana
            await this.seedSectoresRD();

        } catch (error) {
            this.logger.error('❌ Error inicializando base de datos:', error);
            throw error; // Force crash so Docker restarts the service
        }
    }

    async seedSectoresRD() {
        const sectores = [
            { nombre: 'Tecnología', descripcion: 'Software, hardware, telecomunicaciones y servicios TI', icono: '💻', color: '#3B82F6' },
            { nombre: 'Comercio', descripcion: 'Retail, mayoristas, distribuidores y comercio general', icono: '🛒', color: '#10B981' },
            { nombre: 'Manufactura', descripcion: 'Producción industrial, textiles y fabricación', icono: '🏭', color: '#F59E0B' },
            { nombre: 'Construcción', descripcion: 'Proyectos de construcción, inmobiliarias e infraestructura', icono: '🏗️', color: '#EF4444' },
            { nombre: 'Salud', descripcion: 'Hospitales, clínicas, farmacias y equipos médicos', icono: '🏥', color: '#8B5CF6' },
            { nombre: 'Turismo', descripcion: 'Hoteles, restaurantes, agencias de viaje y entretenimiento', icono: '🏖️', color: '#06B6D4' },
            { nombre: 'Agricultura', descripcion: 'Producción agrícola, ganadería y agroindustria', icono: '🌾', color: '#84CC16' },
            { nombre: 'Finanzas', descripcion: 'Bancos, seguros, inversiones y servicios financieros', icono: '💰', color: '#6366F1' },
            { nombre: 'Educación', descripcion: 'Instituciones educativas, capacitación y formación', icono: '📚', color: '#EC4899' },
            { nombre: 'Transporte', descripcion: 'Logística, transporte de carga y pasajeros', icono: '🚚', color: '#14B8A6' },
            { nombre: 'Energía', descripcion: 'Electricidad, combustibles y energías renovables', icono: '⚡', color: '#FBBF24' },
            { nombre: 'Servicios Profesionales', descripcion: 'Consultoría, legal, contabilidad y marketing', icono: '💼', color: '#A855F7' },
        ];

        for (const sector of sectores) {
            const existing = await this.db.query('SELECT id FROM sectors WHERE name = $1', [sector.nombre]);
            if (existing.rows.length === 0) {
                await this.db.query(
                    'INSERT INTO sectors (name, description, icon, color) VALUES ($1, $2, $3, $4)',
                    [sector.nombre, sector.descripcion, sector.icono, sector.color]
                );
                this.logger.log(`✅ Sector creado: ${sector.nombre}`);
            }
        }

        // Seed de tipos de empresa generales
        const tipos = [
            { nombre: 'Proveedor', descripcion: 'Suministra productos o servicios a otras empresas' },
            { nombre: 'Distribuidor', descripcion: 'Distribuye productos al mercado nacional e internacional' },
            { nombre: 'Fabricante', descripcion: 'Produce o manufactura bienes' },
            { nombre: 'Mayorista', descripcion: 'Vende productos al por mayor' },
            { nombre: 'Minorista', descripcion: 'Vende directamente al consumidor final' },
            { nombre: 'Importador', descripcion: 'Importa productos del exterior' },
            { nombre: 'Exportador', descripcion: 'Exporta productos dominicanos' },
            { nombre: 'Consultor', descripcion: 'Ofrece servicios de consultoría especializada' },
        ];

        for (const tipo of tipos) {
            const existing = await this.db.query('SELECT id FROM company_types WHERE name = $1', [tipo.nombre]);
            if (existing.rows.length === 0) {
                await this.db.query(
                    'INSERT INTO company_types (name, description) VALUES ($1, $2)',
                    [tipo.nombre, tipo.descripcion]
                );
                this.logger.log(`✅ Tipo creado: ${tipo.nombre}`);
            }
        }
    }

    async createSuperAdmins() {
        const superAdmins = [
            {
                email: process.env.SUPER_ADMIN_EMAIL_1 || 'adavidfc@hotmail.com',
                name: 'Angel David Flores'
            },
            {
                email: process.env.SUPER_ADMIN_EMAIL_2 || 'expertostird@gmail.com',
                name: 'Adderly Marte'
            },
        ];

        try {
            for (const admin of superAdmins) {
                const existing = await this.db.query(
                    'SELECT id FROM users WHERE email = $1',
                    [admin.email]
                );

                if (existing.rows.length === 0) {
                    const hashedPassword = await bcrypt.hash('JairoApp2026!', 10);

                    await this.db.query(
                        `INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, 'super_admin')`,
                        [admin.email, admin.name, hashedPassword]
                    );

                    this.logger.log(`✅ Super Admin creado: ${admin.email}`);
                } else {
                    this.logger.log(`ℹ️ Super Admin ya existe: ${admin.email}`);
                }
            }
        } catch (error) {
            this.logger.error('❌ Error creando super admins:', error);
        }
    }
}
