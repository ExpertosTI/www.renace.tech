import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from './email/email.module';

@Global()
@Module({
    imports: [
        DatabaseModule,
        EmailModule,
    ],
    exports: [
        DatabaseModule,
        EmailModule,
    ],
})
export class CoreModule { }
