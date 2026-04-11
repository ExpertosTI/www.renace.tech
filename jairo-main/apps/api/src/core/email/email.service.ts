import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Validate required SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('⚠️ SMTP configuration incomplete. Email sending will fail.');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'JairoApp <info@renace.space>',
        to,
        subject,
        html,
      });
      this.logger.log(`📧 Email enviado: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error('❌ Error enviando email:', error);
      return { success: false, error };
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
          .header { background: #fb7701; padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; }
          .btn { display: inline-block; background: #fb7701; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenido a JairoApp</h1>
          </div>
          <div class="content">
            <h2>Hola ${name}!</h2>
            <p>Tu cuenta ha sido creada exitosamente en la plataforma B2B de JairoApp.</p>
            <p>Ya puedes acceder al panel de administración y comenzar a gestionar tu empresa.</p>
            <a href="https://jairoapp.renace.tech/admin" class="btn">Ir al Panel</a>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail(email, '🎉 Bienvenido a JairoApp', html);
  }

  async sendNewCompanyNotification(adminEmail: string, companyName: string) {
    const html = `
      <h2>Nueva empresa registrada</h2>
      <p>La empresa <strong>${companyName}</strong> se ha registrado en JairoApp.</p>
      <a href="https://jairoapp.renace.tech/admin/empresas">Ver en el panel</a>
    `;
    return this.sendEmail(adminEmail, `🏢 Nueva empresa: ${companyName}`, html);
  }

  async sendCompanyApproved(to: string, companyName: string) {
    const html = `
            <h2>¡Tu empresa ha sido aprobada! 🎉</h2>
            <p>La empresa <strong>${companyName}</strong> ha sido validada exitosamente en la plataforma.</p>
            <p>Ahora tu empresa es visible en el directorio y puedes acceder a todas las funcionalidades B2B.</p>
            <a href="https://jairoapp.renace.tech/mi-catalogo">Gestionar mi Catálogo</a>
        `;
    return this.sendEmail(to, `✅ Empresa Aprobada: ${companyName}`, html);
  }

  async sendCompanyRejected(to: string, companyName: string) {
    const html = `
            <h2>Actualización sobre tu registro</h2>
            <p>Lamentamos informarte que el registro de la empresa <strong>${companyName}</strong> no ha sido aprobado en este momento.</p>
            <p>Si crees que esto es un error, por favor contacta a soporte.</p>
        `;
    return this.sendEmail(to, `ℹ️ Estado de registro: ${companyName}`, html);
  }
}
