import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SeedService } from './seed.service';

@Module({
    controllers: [AdminController],
    providers: [AdminService, SeedService],
    exports: [AdminService, SeedService],
})
export class AdminModule { }
