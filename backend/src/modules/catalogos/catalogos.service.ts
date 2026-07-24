import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CATALOGOS } from './catalogos.constants';

/** Forma mínima común a los 24 delegados `cat_*` de Prisma que este servicio necesita. */
interface CatalogDelegate {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  listCatalogos() {
    return Object.keys(CATALOGOS).sort();
  }

  private resolve(catalogo: string) {
    const meta = CATALOGOS[catalogo];
    if (!meta) {
      throw new NotFoundException(
        `Catálogo desconocido: "${catalogo}". Ver GET /catalogos para la lista válida.`,
      );
    }
    // Acceso dinámico deliberado: los 24 catálogos comparten la misma forma CRUD y no
    // justifican 24 servicios/DTOs casi idénticos (ver catalogos.constants.ts).
    const model = (this.prisma as unknown as Record<string, CatalogDelegate>)[meta.modelo];
    return { meta, model };
  }

  findAll(catalogo: string) {
    const { meta, model } = this.resolve(catalogo);
    return model.findMany({ orderBy: { [meta.ordenarPor]: 'asc' } });
  }

  async findOne(catalogo: string, id: number) {
    const { model } = this.resolve(catalogo);
    const registro = await model.findUnique({ where: { id } });
    if (!registro) {
      throw new NotFoundException(`Registro ${id} no encontrado en "${catalogo}"`);
    }
    return registro;
  }

  create(catalogo: string, data: Record<string, unknown>) {
    const { model } = this.resolve(catalogo);
    return model.create({ data });
  }

  async update(catalogo: string, id: number, data: Record<string, unknown>) {
    await this.findOne(catalogo, id);
    const { model } = this.resolve(catalogo);
    return model.update({ where: { id }, data });
  }

  async remove(catalogo: string, id: number) {
    await this.findOne(catalogo, id);
    const { model } = this.resolve(catalogo);
    await model.delete({ where: { id } });
  }
}
