import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
    @IsString()
    content: string;

    @IsString() // Recipient can be UUID or potentially slug/username depending on implementation, but likely UUID
    @IsOptional()
    recipientId?: string;

    @IsUUID()
    @IsOptional()
    conversationId?: string;
}
