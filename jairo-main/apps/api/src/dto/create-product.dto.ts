import { IsString, IsNumber, IsOptional, IsArray, Min, IsUUID } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @IsNumber()
    @Min(1)
    @IsOptional()
    minOrderQty?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsUUID()
    @IsOptional()
    categoryId?: string;
}
