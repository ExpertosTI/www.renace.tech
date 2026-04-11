import { IsEmail, IsNotEmpty, IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateCompanyDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
    @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
    nombre: string;

    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'El email es requerido' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'El teléfono es requerido' })
    telefono: string;

    @IsString()
    @IsOptional()
    rnc?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsUrl({}, { message: 'URL inválida' })
    @IsOptional()
    website?: string;

    @IsString()
    @IsOptional()
    sectorId?: string;

    @IsString()
    @IsOptional()
    tipoId?: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
    descripcion?: string;
}

export class UpdateCompanyDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    nombre?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsUrl()
    @IsOptional()
    website?: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    descripcion?: string;
}

export class ConnectionRequestDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID de la empresa objetivo es requerido' })
    targetCompanyId: string;

    @IsString()
    @IsOptional()
    @MaxLength(500, { message: 'El mensaje no puede exceder 500 caracteres' })
    mensaje?: string;
}
