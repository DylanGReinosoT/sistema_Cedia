import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class LinkOdsMetaDto {
  @ApiProperty()
  @IsInt()
  ods_meta_id: number;
}
