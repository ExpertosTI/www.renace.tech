import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { events, eventAttendance } from '@repo/database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createEvent(data: any) {
    return this.db.drizzle.insert(events).values(data).returning();
  }

  async listEvents() {
    return this.db.drizzle.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.eventDate)],
    });
  }

  async registerAttendance(data: any) {
    this.logger.log(`📝 Registering attendance for ${data.guestName} at event ${data.eventId}`);
    
    // Check if already registered
    const existing = await this.db.drizzle.query.eventAttendance.findFirst({
      where: and(
        eq(eventAttendance.eventId, data.eventId),
        eq(eventAttendance.email, data.email)
      )
    });

    if (existing) {
      return this.db.drizzle.update(eventAttendance)
        .set({ ...data, confirmed: true, validatedAt: new Date() })
        .where(eq(eventAttendance.id, existing.id))
        .returning();
    }

    return this.db.drizzle.insert(eventAttendance)
      .values({ ...data, confirmed: true, validatedAt: new Date() })
      .returning();
  }

  async getAttendanceList(eventId: string) {
    return this.db.drizzle.query.eventAttendance.findMany({
      where: eq(eventAttendance.eventId, eventId),
      orderBy: (attendance, { desc }) => [desc(attendance.createdAt)],
    });
  }
}
