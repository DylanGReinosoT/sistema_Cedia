import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
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

  @ApiProperty({
    example: 'Contrasena#Segura2026',
    description: 'Mínimo 8 caracteres, al menos una letra y un número',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // límite práctico de bcrypt
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir al menos una letra y un número',
  })
  password: string;

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
