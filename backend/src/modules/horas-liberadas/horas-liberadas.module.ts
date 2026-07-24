import { Module } from '@nestjs/common';
import { HorasLiberadasService } from './horas-liberadas.service';
import { HorasLiberadasController } from './horas-liberadas.controller';
import { ProyectosModule } from '../proyectos/proyectos.module';

@Module({
  imports: [ProyectosModule],
  controllers: [HorasLiberadasController],
  providers: [HorasLiberadasService],
})
export class HorasLiberadasModule {}
