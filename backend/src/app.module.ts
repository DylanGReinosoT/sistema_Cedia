import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { ConvocatoriasModule } from './modules/convocatorias/convocatorias.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { AprobacionesModule } from './modules/aprobaciones/aprobaciones.module';
import { HorasLiberadasModule } from './modules/horas-liberadas/horas-liberadas.module';
import { SeguimientoModule } from './modules/seguimiento/seguimiento.module';
import { InformesModule } from './modules/informes/informes.module';
import { ProrrogasCierreModule } from './modules/prorrogas-cierre/prorrogas-cierre.module';
import { ImpactoModule } from './modules/impacto/impacto.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { AlertasSchedulerModule } from './modules/alertas-scheduler/alertas-scheduler.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    CatalogosModule,
    ConvocatoriasModule,
    ProyectosModule,
    AprobacionesModule,
    HorasLiberadasModule,
    SeguimientoModule,
    InformesModule,
    ProrrogasCierreModule,
    ImpactoModule,
    NotificacionesModule,
    AlertasSchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Orden: Throttler -> Auth (JWT) -> Roles. Nest ejecuta los guards globales en el
    // orden en que se registran.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
