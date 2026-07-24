import { PartialType } from '@nestjs/swagger';
import { CreateObjetivoDto } from './create-objetivo.dto';

export class UpdateObjetivoDto extends PartialType(CreateObjetivoDto) {}
