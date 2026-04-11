import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { RfqService } from './rfq.service';
import { CreateRfqDto } from '../dto/create-rfq.dto';

@Controller('rfq')
export class RfqController {
    constructor(private readonly rfqService: RfqService) { }

    // Crear solicitud de cotización
    @Post()
    async createRfq(
        @Body() body: CreateRfqDto,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.rfqService.createRfq(token, body);
    }

    // Listar RFQs públicos
    @Get()
    async listPublicRfqs(
        @Query('sector') sector?: string,
        @Query('page') page: number = 1
    ) {
        return this.rfqService.listPublicRfqs(sector, page);
    }

    // Mis RFQs (enviados)
    @Get('my-requests')
    async getMyRfqs(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.rfqService.getMyRfqs(token);
    }

    // RFQs recibidos
    @Get('received')
    async getReceivedRfqs(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.rfqService.getReceivedRfqs(token);
    }

    // Detalle de RFQ
    @Get(':id')
    async getRfqDetail(@Param('id') id: string) {
        return this.rfqService.getRfqDetail(id);
    }

    // Responder a RFQ (cotizar)
    @Post(':id/quote')
    async submitQuote(
        @Param('id') rfqId: string,
        @Body() body: {
            price: number;
            deliveryDays: number;
            notes?: string;
        },
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.rfqService.submitQuote(rfqId, token, body);
    }

    // Aceptar cotización
    @Post(':id/quote/:quoteId/accept')
    async acceptQuote(
        @Param('id') rfqId: string,
        @Param('quoteId') quoteId: string,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.rfqService.acceptQuote(rfqId, quoteId, token);
    }
}
