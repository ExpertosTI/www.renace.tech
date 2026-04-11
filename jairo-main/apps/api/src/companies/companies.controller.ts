import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('empresas')
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) { }

    @Get()
    async findAll(
        @Query('sector') sector?: string,
        @Query('tipo') tipo?: string,
        @Query('estado') estado?: string,
        @Query('busqueda') busqueda?: string,
    ) {
        return this.companiesService.findAll({ sector, tipo, estado, busqueda });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.companiesService.findOne(id);
    }

    @Post()
    async create(@Body() data: any) {
        return this.companiesService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.companiesService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.companiesService.remove(id);
    }

    @Post(':id/conexion')
    async solicitarConexion(
        @Param('id') empresaId: string,
        @Body() data: { empresaDestinoId: string; tipo: string },
    ) {
        return this.companiesService.solicitarConexion(empresaId, data.empresaDestinoId, data.tipo);
    }

    @Get(':id/conexiones')
    async getConexiones(@Param('id') empresaId: string) {
        return this.companiesService.getConexiones(empresaId);
    }
}
