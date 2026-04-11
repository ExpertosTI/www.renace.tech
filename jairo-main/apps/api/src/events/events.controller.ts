import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  listEvents() {
    return this.eventsService.listEvents();
  }

  @Post('attendance')
  registerAttendance(@Body() data: any) {
    return this.eventsService.registerAttendance(data);
  }

  @Get(':id/attendance')
  getAttendanceList(@Param('id') id: string) {
    return this.eventsService.getAttendanceList(id);
  }
}
