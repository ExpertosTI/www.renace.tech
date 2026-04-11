import { IsString, IsNumber, IsOptional, IsDateString, IsArray, IsUUID, Min } from 'class-validator';

export class CreateRfqDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    @IsOptional()
    sectorId?: string;

    @IsNumber()
    @Min(1)
    @IsOptional()
    quantity?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    budget?: number;

    @IsDateString()
    @IsOptional()
    deadline?: string;

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    targetCompanyIds?: string[];
}
