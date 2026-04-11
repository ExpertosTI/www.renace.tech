import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { SectorsService } from './sectors.service';

@Controller('sectores')
export class SectorsController {
    constructor(private readonly sectorsService: SectorsService) { }

    @Get()
    async findAll() {
        return this.sectorsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.sectorsService.findOne(id);
    }

    @Post()
    async create(@Body() data: any) {
        return this.sectorsService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.sectorsService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.sectorsService.remove(id);
    }

    @Get(':id/tipos')
    async getTipos(@Param('id') sectorId: string) {
        return this.sectorsService.getTiposBySector(sectorId);
    }
}
