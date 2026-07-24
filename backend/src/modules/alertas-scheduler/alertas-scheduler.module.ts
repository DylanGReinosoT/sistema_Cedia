import { Module } from '@nestjs/common';
import { AlertasSchedulerService } from './alertas-scheduler.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  providers: [AlertasSchedulerService],
})
export class AlertasSchedulerModule {}
