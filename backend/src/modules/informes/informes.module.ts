import { Module } from '@nestjs/common';
import { InformesService } from './informes.service';
import { InformesController } from './informes.controller';
import { PeriodosReporteController } from './periodos-reporte.controller';
import { ProyectosModule } from '../proyectos/proyectos.module';

@Module({
  imports: [ProyectosModule],
  controllers: [InformesController, PeriodosReporteController],
  providers: [InformesService],
})
export class InformesModule {}
