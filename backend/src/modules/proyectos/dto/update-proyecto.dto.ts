import { PartialType } from '@nestjs/swagger';
import { CreateProyectoDto } from './create-proyecto.dto';

/** El estado no se cambia aquí — ver AprobacionesModule y ProrrogasCierreModule. */
export class UpdateProyectoDto extends PartialType(CreateProyectoDto) {}
