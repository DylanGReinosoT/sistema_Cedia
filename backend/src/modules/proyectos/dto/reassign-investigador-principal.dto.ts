import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReassignInvestigadorPrincipalDto {
  @ApiProperty({ description: 'usuarios.id del nuevo investigador principal' })
  @IsUUID()
  investigador_principal_id: string;
}