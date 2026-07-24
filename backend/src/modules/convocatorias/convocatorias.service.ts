import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConvocatoriaDto } from './dto/create-convocatoria.dto';
import { UpdateConvocatoriaDto } from './dto/update-convocatoria.dto';
import { FindConvocatoriasQueryDto } from './dto/find-convocatorias-query.dto';
import { toDateOrUndefined } from '../../common/utils/date.util';

@Injectable()
export class ConvocatoriasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: FindConvocatoriasQueryDto) {
    return this.prisma.convocatorias.findMany({
      where: {
        entidad_financiadora_id: query.entidad_financiadora_id,
        estado: query.estado,
      },
      include: { cat_entidades_financiadoras: true },
      orderBy: { fecha_apertura: 'desc' },
    });
  }

  async findOne(id: string) {
    const convocatoria = await this.prisma.convocatorias.findUnique({
      where: { id },
      include: { cat_entidades_financiadoras: true },
    });
    if (!convocatoria) {
      throw new NotFoundException('Convocatoria no encontrada');
    }
    return convocatoria;
  }

  create(dto: CreateConvocatoriaDto) {
    return this.prisma.convocatorias.create({
      data: {
        ...dto,
        fecha_apertura: toDateOrUndefined(dto.fecha_apertura)!,
        fecha_cierre: toDateOrUndefined(dto.fecha_cierre)!,
      },
    });
  }

  async update(id: string, dto: UpdateConvocatoriaDto) {
    await this.findOne(id);
    return this.prisma.convocatorias.update({
      where: { id },
      data: {
        ...dto,
        fecha_apertura: toDateOrUndefined(dto.fecha_apertura),
        fecha_cierre: toDateOrUndefined(dto.fecha_cierre),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.convocatorias.delete({ where: { id } });
  }
}
