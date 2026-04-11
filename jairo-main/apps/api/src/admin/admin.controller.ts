import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Role } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    @Roles(Role.SuperAdmin)
    async getStats() {
        return this.adminService.getSystemStats();
    }

    @Get('companies/pending')
    @Roles(Role.SuperAdmin)
    async getPendingCompanies() {
        return this.adminService.getPendingCompanies();
    }

    @Post('companies/:id/approve')
    @Roles(Role.SuperAdmin)
    async approveCompany(@Param('id') id: string) {
        return this.adminService.approveCompany(id);
    }

    @Post('companies/:id/reject')
    @Roles(Role.SuperAdmin)
    async rejectCompany(@Param('id') id: string) {
        return this.adminService.rejectCompany(id);
    }
}
