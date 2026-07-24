import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Alta de usuario por un ADMINISTRADOR (sin que la persona se registre por su cuenta).
 * A diferencia de RegisterDto, no pide contraseña: el backend genera una temporal y la
 * devuelve una sola vez en la respuesta para que el administrador se la entregue.
 */
export class CreateUsuarioDto {
  @ApiProperty({ example: '1712345678' })
  @IsString()
  @MaxLength(20)
  cedula: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @MaxLength(150)
  nombres: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MaxLength(150)
  apellidos: string;

  @ApiProperty({ example: 'ana.perez@espe.edu.ec' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({ example: '0999999999' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  departamento_id?: number;
}