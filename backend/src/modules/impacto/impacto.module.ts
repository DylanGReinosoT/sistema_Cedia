import { Module } from '@nestjs/common';
import { ImpactoService } from './impacto.service';
import { ImpactoController } from './impacto.controller';
import { IndiceHController } from './indice-h.controller';
import { ProyectosModule } from '../proyectos/proyectos.module';

@Module({
  imports: [ProyectosModule],
  controllers: [ImpactoController, IndiceHController],
  providers: [ImpactoService],
})
export class ImpactoModule {}
