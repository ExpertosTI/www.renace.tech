import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from '../dto/send-message.dto';

@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    // Obtener conversaciones del usuario
    @Get('conversations')
    async getConversations(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.messagesService.getConversations(token);
    }

    // Obtener mensajes de una conversación
    @Get('conversation/:id')
    async getMessages(
        @Param('id') conversationId: string,
        @Headers('authorization') auth: string,
        @Query('page') page: number = 1
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.messagesService.getMessages(conversationId, token, page);
    }

    // Enviar mensaje
    @Post('send')
    async sendMessage(
        @Body() body: SendMessageDto,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.messagesService.sendMessage(token, body.content, body.recipientId, body.conversationId);
    }

    // Marcar como leído
    @Post('read/:conversationId')
    async markAsRead(
        @Param('conversationId') conversationId: string,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.messagesService.markAsRead(conversationId, token);
    }

    // Obtener conteo de no leídos
    @Get('unread-count')
    async getUnreadCount(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.messagesService.getUnreadCount(token);
    }
}
