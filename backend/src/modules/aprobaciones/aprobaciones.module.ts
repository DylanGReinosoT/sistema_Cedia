import { Module } from '@nestjs/common';
import { AprobacionesService } from './aprobaciones.service';
import { AprobacionesController } from './aprobaciones.controller';
import { ProyectosModule } from '../proyectos/proyectos.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [ProyectosModule, UsuariosModule],
  controllers: [AprobacionesController],
  providers: [AprobacionesService],
})
export class AprobacionesModule {}
