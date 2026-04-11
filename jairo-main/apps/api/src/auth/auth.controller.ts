import { Controller, Post, Body, Get, Request, HttpException, HttpStatus, Query, Res } from '@nestjs/common';
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
    async googleAuth(@Res() res: Response) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = encodeURIComponent('https://jairoapp.renace.tech/api/auth/google/callback');
        const scope = encodeURIComponent('email profile');
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
        res.redirect(googleAuthUrl);
    }

    // Google OAuth callback
    @Get('google/callback')
    async googleCallback(@Query('code') code: string, @Res() res: Response) {
        try {
            if (!code) {
                return res.redirect('https://jairoapp.renace.tech/login?error=no_code');
            }

            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.GOOGLE_CLIENT_ID || '',
                    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                    redirect_uri: 'https://jairoapp.renace.tech/api/auth/google/callback',
                    grant_type: 'authorization_code'
                })
            });

            const tokens = await tokenResponse.json();

            if (!tokens.access_token) {
                console.error('Google Token Error:', tokens);
                return res.redirect(`https://jairoapp.renace.tech/login?error=token_failed&details=${encodeURIComponent(JSON.stringify(tokens))}`);
            }

            // Get user info
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });

            const userInfo = await userInfoResponse.json();

            // Validate/create user
            const user = await this.authService.validateGoogleUser({
                email: userInfo.email,
                firstName: userInfo.given_name || '',
                lastName: userInfo.family_name || '',
                picture: userInfo.picture || ''
            });

            // Generate JWT token
            const { token } = await this.authService.loginGoogle(user);

            // Redirect to frontend callback (works with popup)
            res.redirect(`https://jairoapp.renace.tech/auth/callback?token=${token}`);
        } catch (error: any) {
            console.error('Google OAuth error:', error);
            res.redirect(`https://jairoapp.renace.tech/auth/callback?error=oauth_failed&details=${encodeURIComponent(error.message || 'Unknown error')}`);
        }
    }
}
