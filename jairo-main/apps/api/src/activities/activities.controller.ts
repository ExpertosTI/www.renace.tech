import { Controller, Get, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';

@Controller('actividades')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @Get()
    async findAll(@Query('limite') limite?: string) {
        return this.activitiesService.findAll(parseInt(limite || '20'));
    }

    @Get('recientes')
    async getRecientes() {
        return this.activitiesService.getRecientes();
    }
}
