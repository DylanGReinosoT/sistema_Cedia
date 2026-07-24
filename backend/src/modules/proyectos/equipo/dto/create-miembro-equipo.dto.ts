import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Miembro interno (usuario_id) o externo (externo_*), nunca ambos ni ninguno — el `CHECK`
 * de `proyecto_equipo` en la base de datos es la autoridad final (ver PrismaExceptionFilter,
 * código P2004); esta validación cubre los casos comunes con un 400 más claro.
 */
export class CreateMiembroEquipoDto {
  @ApiProperty({ description: 'FK a cat_roles_proyecto' })
  @IsInt()
  rol_proyecto_id: number;

  @ApiPropertyOptional({ description: 'Miembro interno (ESPE)' })
  @ValidateIf((o) => !o.externo_identificacion)
  @IsUUID()
  usuario_id?: string;

  @ApiPropertyOptional({ description: 'Miembro externo: identificación' })
  @ValidateIf((o) => !o.usuario_id)
  @IsString()
  @MaxLength(20)
  externo_identificacion?: string;

  @ApiPropertyOptional({ description: 'Miembro externo: nombres' })
  @ValidateIf((o) => !o.usuario_id)
  @IsString()
  @MaxLength(150)
  externo_nombres?: string;

  @ApiPropertyOptional({ description: 'Miembro externo: apellidos' })
  @ValidateIf((o) => !o.usuario_id)
  @IsString()
  @MaxLength(150)
  externo_apellidos?: string;

  @ApiPropertyOptional({ description: 'FK a cat_instituciones_socias (institución de origen del externo)' })
  @IsOptional()
  @IsInt()
  externo_institucion_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  externo_correo?: string;
}
