import { Controller, Get, Post, Param, Query, Headers } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // Estadísticas generales del dashboard
    @Get('dashboard')
    async getDashboardStats(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.getDashboardStats(token);
    }

    // Quién vio mi perfil
    @Get('profile-views')
    async getProfileViews(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.getProfileViews(token);
    }

    // Registrar vista de perfil
    @Post('view/:companyId')
    async recordProfileView(
        @Param('companyId') companyId: string,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.recordProfileView(companyId, token);
    }

    // Análisis de conexiones
    @Get('connections')
    async getConnectionsAnalytics(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.getConnectionsAnalytics(token);
    }

    // Actividad de productos
    @Get('products')
    async getProductsAnalytics(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.getProductsAnalytics(token);
    }

    // Rendimiento de RFQs
    @Get('rfqs')
    async getRfqAnalytics(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.getRfqAnalytics(token);
    }

    // Exportar reporte
    @Get('export/:type')
    async exportReport(
        @Param('type') type: string,
        @Query('format') format: string = 'json',
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.analyticsService.exportReport(type, format, token);
    }

    @Get('public-stats')
    async getPublicStats() {
        return this.analyticsService.getPublicStats();
    }
}
