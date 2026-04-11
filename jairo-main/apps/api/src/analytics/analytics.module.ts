import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
    controllers: [AnalyticsController, DashboardController],
    providers: [AnalyticsService, DashboardService],
    exports: [AnalyticsService, DashboardService],
})
export class AnalyticsModule { }
