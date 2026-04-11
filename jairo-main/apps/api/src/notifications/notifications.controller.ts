import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // Obtener notificaciones
    @Get()
    async getNotifications(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.notificationsService.getNotifications(token);
    }

    // Marcar como leída
    @Post(':id/read')
    async markAsRead(
        @Param('id') id: string,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.notificationsService.markAsRead(id, token);
    }

    // Marcar todas como leídas
    @Post('read-all')
    async markAllAsRead(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.notificationsService.markAllAsRead(token);
    }

    // Obtener conteo de no leídas
    @Get('unread-count')
    async getUnreadCount(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.notificationsService.getUnreadCount(token);
    }

    // Configurar preferencias
    @Post('preferences')
    async updatePreferences(
        @Body() body: {
            emailConnections?: boolean;
            emailMessages?: boolean;
            emailRfqs?: boolean;
            pushEnabled?: boolean;
        },
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.notificationsService.updatePreferences(token, body);
    }
}
