import { Module } from '@nestjs/common';
import { ProrrogasCierreService } from './prorrogas-cierre.service';
import { ProrrogasCierreController } from './prorrogas-cierre.controller';
import { ProyectosModule } from '../proyectos/proyectos.module';

@Module({
  imports: [ProyectosModule],
  controllers: [ProrrogasCierreController],
  providers: [ProrrogasCierreService],
})
export class ProrrogasCierreModule {}
