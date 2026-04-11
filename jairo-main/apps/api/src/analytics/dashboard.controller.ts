import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('estadisticas')
    async getEstadisticas() {
        return this.dashboardService.getEstadisticas();
    }

    @Get('empresas-recientes')
    async getEmpresasRecientes() {
        return this.dashboardService.getEmpresasRecientes();
    }

    @Get('actividades-recientes')
    async getActividadesRecientes() {
        return this.dashboardService.getActividadesRecientes();
    }

    @Get('sectores-distribucion')
    async getSectoresDistribucion() {
        return this.dashboardService.getSectoresDistribucion();
    }

    @Get('conexiones-recientes')
    async getConexionesRecientes() {
        return this.dashboardService.getConexionesRecientes();
    }
}
