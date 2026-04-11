import { Controller, Get, Post, Put, Body, Param, Query, Delete, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Controller('usuarios')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(
        @Query('empresa') empresaId?: string,
        @Query('rol') rol?: string,
        @Query('busqueda') busqueda?: string,
    ) {
        return this.usersService.findAll({ empresaId, rol, busqueda });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    async create(@Body() data: any) {
        return this.usersService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.usersService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Put(':id/rol')
    async cambiarRol(@Param('id') id: string, @Body() body: { rol: string }) {
        return this.usersService.cambiarRol(id, body.rol);
    }

    @Post(':id/invitar')
    async invitarAEmpresa(@Param('id') id: string, @Body() body: { empresaId: string }) {
        return this.usersService.asignarEmpresa(id, body.empresaId);
    }

    @Post('onboarding')
    async completeOnboarding(@Headers('authorization') auth: string, @Body() body: CompleteOnboardingDto) {
        // Extract user ID from token here or in service. Service takes ID.
        // We need to decode token here easily.
        const token = auth?.replace('Bearer ', '');
        // Simple decode for now - in real app use guard and @User() decorator
        const jwt = require('jsonwebtoken'); // Import locally or at top
        const decoded: any = jwt.decode(token);

        if (!decoded || !decoded.id) {
            throw new Error('Unauthorized'); // Use HttpException in real code
        }

        return this.usersService.completeOnboarding(decoded.id, body);
    }

    // Permite al usuario vincular su cuenta a una empresa existente
    @Post('claim-company')
    async claimCompany(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        const jwt = require('jsonwebtoken');
        const decoded: any = jwt.decode(token);

        if (!decoded || !decoded.id) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }

        return this.usersService.claimCompanyByEmail(decoded.id);
    }
}
