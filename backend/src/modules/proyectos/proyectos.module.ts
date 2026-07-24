import { Module } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { ProyectosController } from './proyectos.controller';
import { EstadoProyectoService } from './services/estado-proyecto.service';
import { FormulacionService } from './formulacion/formulacion.service';
import { FormulacionController } from './formulacion/formulacion.controller';
import { EquipoService } from './equipo/equipo.service';
import { EquipoController } from './equipo/equipo.controller';
import { RequisitosService } from './requisitos/requisitos.service';
import { RequisitosController } from './requisitos/requisitos.controller';

@Module({
  controllers: [
    ProyectosController,
    FormulacionController,
    EquipoController,
    RequisitosController,
  ],
  providers: [
    ProyectosService,
    EstadoProyectoService,
    FormulacionService,
    EquipoService,
    RequisitosService,
  ],
  exports: [ProyectosService, EstadoProyectoService],
})
export class ProyectosModule {}
