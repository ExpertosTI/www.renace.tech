import { IsString, IsOptional, IsBoolean, IsArray, IsUrl } from 'class-validator';

export class CompleteOnboardingDto {
    // User Profile
    @IsString()
    nombre: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsString()
    @IsOptional()
    cargo?: string;

    // Company
    @IsString()
    empresaNombre: string;

    @IsString()
    @IsOptional()
    empresaDescripcion?: string;

    @IsString()
    sector: string; // The sector name or ID? UI sends generic values like 'tecnologia', we need to map or strictly use IDs. Let's assume slug/name for now.

    @IsString()
    tipoEmpresa: string;

    @IsUrl()
    @IsOptional()
    website?: string;

    // Products
    @IsBoolean()
    tieneProductos: boolean;

    @IsString()
    @IsOptional()
    productosDescripcion?: string;

    // Goals
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    objetivos?: string[];
}
