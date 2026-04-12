import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ValidationPipe } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { SectorsModule } from './sectors/sectors.module';
import { ProductsModule } from './products/products.module';
import { MessagingModule } from './messaging/messaging.module';
import { RfqModule } from './rfq/rfq.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivitiesModule } from './activities/activities.module';
import { AdminModule } from './admin/admin.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // Core & Shared
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    CompaniesModule,
    RelationshipsModule,
    SectorsModule,
    ProductsModule,
    RfqModule,
    MessagingModule,
    AnalyticsModule,
    NotificationsModule,
    ActivitiesModule,
    AdminModule,
    OpportunitiesModule,
    EventsModule,

    // Rate Limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Validation Pipe
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule { }
