import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../core/email/email.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly jwtSecret: string;

    constructor(
        private readonly emailService: EmailService,
        private readonly db: DatabaseService
    ) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is required');
        }
        this.jwtSecret = secret;
    }

    async login(email: string, password: string) {
        try {
            const result = await this.db.query(`
                SELECT u.*, c.name as empresa_nombre, c.slug as empresa_slug
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                WHERE u.email = $1
            `, [email.toLowerCase()]);

            if (result.rows.length === 0) {
                throw new HttpException('Credenciales inválidas', HttpStatus.UNAUTHORIZED);
            }

            const user = result.rows[0];
            const passwordValid = await bcrypt.compare(password, user.password);

            if (!passwordValid) {
                throw new HttpException('Credenciales inválidas', HttpStatus.UNAUTHORIZED);
            }

            const token = this.generateToken(user);

            // Registrar actividad
            await this.registrarActividad('login', user.id, `Inicio de sesión: ${user.name}`);

            this.logger.log(`✅ Login exitoso: ${email}`);

            return {
                token,
                usuario: {
                    id: user.id,
                    email: user.email,
                    nombre: user.name,
                    rol: user.role,
                    avatar: user.avatar,
                    empresa: user.empresa_nombre ? {
                        id: user.company_id,
                        nombre: user.empresa_nombre,
                        slug: user.empresa_slug
                    } : null
                }
            };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error(`Login error for ${email}`, error);
            throw new HttpException('Error al iniciar sesión', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async registro(data: { email: string; password: string; nombre: string; empresaId?: string }) {
        try {
            // Verificar si ya existe
            const existing = await this.db.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
            if (existing.rows.length > 0) {
                throw new HttpException('El email ya está registrado', HttpStatus.CONFLICT);
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);

            const result = await this.db.query(`
                INSERT INTO users (email, password, name, role, company_id)
                VALUES ($1, $2, $3, 'user', $4)
                RETURNING id, email, name, role
            `, [data.email.toLowerCase(), hashedPassword, data.nombre, data.empresaId || null]);

            const user = result.rows[0];

            // Enviar email de bienvenida
            try {
                await this.emailService.sendWelcomeEmail(user.email, user.name);
            } catch (e) {
                this.logger.warn(`Failed to send welcome email to ${user.email}`);
            }

            // Registrar actividad
            await this.registrarActividad('nuevo_usuario', user.id, `Nuevo usuario registrado: ${user.name}`);

            const token = this.generateToken(user);

            this.logger.log(`✅ Usuario registrado: ${data.email}`);

            return {
                token,
                usuario: {
                    id: user.id,
                    email: user.email,
                    nombre: user.name,
                    rol: user.role
                },
                mensaje: 'Registro exitoso. ¡Bienvenido a JairoApp!'
            };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error(`Registro error for ${data.email}`, error);
            throw new HttpException('Error al registrar usuario', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async enviarRecuperacion(email: string) {
        try {
            const result = await this.db.query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()]);

            if (result.rows.length === 0) {
                return { mensaje: 'Si el email existe, recibirás un enlace de recuperación' };
            }

            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, type: 'password_reset' }, this.jwtSecret, { expiresIn: '1h' });
            const resetLink = `https://jairoapp.renace.tech/recuperar?token=${token}`;

            await this.emailService.sendEmail(
                email,
                'Recuperar contraseña - JairoApp',
                `
                    <h2>Hola ${user.name}</h2>
                    <p>Has solicitado restablecer tu contraseña.</p>
                    <p><a href="${resetLink}" style="background: #fb7701; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
                    <p>Este enlace expira en 1 hora.</p>
                `
            );

            this.logger.log(`📧 Email de recuperación enviado: ${email}`);
            return { mensaje: 'Si el email existe, recibirás un enlace de recuperación' };

        } catch (error) {
            this.logger.error(`Recovery error for ${email}`, error);
            throw new HttpException('Error al procesar solicitud', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async cambiarPassword(token: string, nuevaPassword: string) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as any;

            if (decoded.type !== 'password_reset') {
                throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
            }

            const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
            await this.db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, decoded.id]);

            return { mensaje: 'Contraseña actualizada exitosamente' };
        } catch (error) {
            throw new HttpException('Token inválido o expirado', HttpStatus.BAD_REQUEST);
        }
    }

    async getPerfil(userId: string) {
        if (!userId) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        const result = await this.db.query(`
            SELECT u.id, u.email, u.name, u.role, u.avatar, u.created_at,
                   c.name as empresa_nombre, c.id as empresa_id
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        }

        return result.rows[0];
    }

    private async registrarActividad(tipo: string, userId: string | null, descripcion: string) {
        try {
            await this.db.query(
                'INSERT INTO activities (type, user_id, description) VALUES ($1, $2, $3)',
                [tipo, userId, descripcion]
            );
        } catch (error) {
            this.logger.warn('No se pudo registrar actividad', error);
        }
    }

    async validateGoogleUser(googleUser: { email: string; firstName: string; lastName: string; picture: string }) {
        try {
            // 1. Revisar si el email existe
            const res = await this.db.query('SELECT * FROM users WHERE email = $1', [googleUser.email.toLowerCase()]);

            if (res.rows.length > 0) {
                return res.rows[0];
            }

            // 2. Si no existe, crear usuario
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const fullName = `${googleUser.firstName} ${googleUser.lastName}`.trim();

            const newUserRes = await this.db.query(`
                INSERT INTO users (email, password, name, role, avatar, created_at)
                VALUES ($1, $2, $3, 'user', $4, NOW())
                RETURNING *
            `, [googleUser.email.toLowerCase(), hashedPassword, fullName, googleUser.picture]);

            const newUser = newUserRes.rows[0];

            // Enviar bienvenida
            try {
                await this.emailService.sendWelcomeEmail(newUser.email, newUser.name);
            } catch (e) {
                this.logger.warn(`No se pudo enviar email de bienvenida a ${newUser.email}`);
            }

            return newUser;
        } catch (error) {
            this.logger.error('Google validation error', error);
            throw new HttpException('Error validating Google user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async loginGoogle(user: any) {
        const token = this.generateToken(user);
        return { token, user };
    }

    private generateToken(user: any) {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                companyId: user.company_id
            },
            this.jwtSecret,
            { expiresIn: '7d' }
        );
    }
}

