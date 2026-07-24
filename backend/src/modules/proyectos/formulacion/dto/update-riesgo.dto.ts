import { PartialType } from '@nestjs/swagger';
import { CreateRiesgoDto } from './create-riesgo.dto';

export class UpdateRiesgoDto extends PartialType(CreateRiesgoDto) {}
