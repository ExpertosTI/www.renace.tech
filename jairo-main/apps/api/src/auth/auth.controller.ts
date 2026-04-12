import { Controller, Post, Body, Get, Request, Req, Res, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        if (!body.email || !body.password) {
            throw new HttpException('Email y contraseña son requeridos', HttpStatus.BAD_REQUEST);
        }
        return this.authService.login(body.email, body.password);
    }

    @Post('registro')
    async registro(@Body() body: {
        email: string;
        password: string;
        nombre: string;
        empresaId?: string;
    }) {
        if (!body.email || !body.password || !body.nombre) {
            throw new HttpException('Email, contraseña y nombre son requeridos', HttpStatus.BAD_REQUEST);
        }
        return this.authService.registro(body);
    }

    @Post('recuperar')
    async recuperarPassword(@Body() body: { email: string }) {
        return this.authService.enviarRecuperacion(body.email);
    }

    @Post('cambiar-password')
    async cambiarPassword(@Body() body: { token: string; nuevaPassword: string }) {
        return this.authService.cambiarPassword(body.token, body.nuevaPassword);
    }

    @Get('perfil')
    async getPerfil(@Request() req: any) {
        return this.authService.getPerfil(req.user?.id);
    }

    @Post('logout')
    async logout(@Body() body: { token: string }) {
        return { mensaje: 'Sesión cerrada exitosamente' };
    }

    // Google OAuth - redirect to Google
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Guard handles the redirect
    }

    // Google OAuth callback
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleCallback(@Req() req: any, @Res() res: Response) {
        try {
            const user = req.user;
            if (!user) {
                return res.redirect('https://jairoapp.renace.tech/login?error=no_user');
            }

            // Validar/crear usuario en DB mediante el servicio
            const dbUser = await this.authService.validateGoogleUser({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                picture: user.picture
            });

            // Generar JWT token
            const { token } = await this.authService.loginGoogle(dbUser);

            // Redirigir al callback del frontend (funciona con popup)
            res.redirect(`https://jairoapp.renace.tech/auth/callback?token=${token}`);
        } catch (error: any) {
            console.error('Google OAuth error:', error);
            res.redirect(`https://jairoapp.renace.tech/auth/callback?error=oauth_failed&details=${encodeURIComponent(error.message || 'Unknown error')}`);
        }
    }
}
