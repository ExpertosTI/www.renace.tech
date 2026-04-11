import { Controller, Get, Post, Put, Body, Param, Query, Delete } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';

@Controller('relaciones')
export class RelationshipsController {
    constructor(private readonly relationshipsService: RelationshipsService) { }

    @Get()
    async findAll(
        @Query('empresa') empresaId?: string,
        @Query('tipo') tipo?: string,
        @Query('estado') estado?: string,
    ) {
        return this.relationshipsService.findAll({ empresaId, tipo, estado });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.relationshipsService.findOne(id);
    }

    @Post()
    async create(@Body() data: {
        empresaOrigenId: string;
        empresaDestinoId: string;
        tipo: string;
        notas?: string;
    }) {
        return this.relationshipsService.create(data);
    }

    @Put(':id/aprobar')
    async aprobar(@Param('id') id: string) {
        return this.relationshipsService.cambiarEstado(id, 'active');
    }

    @Put(':id/rechazar')
    async rechazar(@Param('id') id: string) {
        return this.relationshipsService.cambiarEstado(id, 'rejected');
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.relationshipsService.remove(id);
    }

    @Get('empresa/:empresaId')
    async getByEmpresa(@Param('empresaId') empresaId: string) {
        return this.relationshipsService.getByEmpresa(empresaId);
    }

    @Get('estadisticas/resumen')
    async getEstadisticas() {
        return this.relationshipsService.getEstadisticas();
    }
}
