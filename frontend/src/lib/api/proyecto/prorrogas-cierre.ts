import { api } from "../client";
import type { CierreProyecto, Prorroga } from "@/lib/types/entities";

export function listProrrogas(proyectoId: string) {
  return api.get<Prorroga[]>(`/proyectos/${proyectoId}/prorrogas`);
}

export interface CreateProrrogaInput {
  fecha_vencimiento_original: string;
  fecha_nueva_vencimiento: string;
  motivo: string;
  documento_aval_externo_url: string;
}

export function createProrroga(proyectoId: string, body: CreateProrrogaInput) {
  return api.post<Prorroga>(`/proyectos/${proyectoId}/prorrogas`, body);
}

export function avalarProrroga(proyectoId: string, prorrogaId: string) {
  return api.patch<Prorroga>(`/proyectos/${proyectoId}/prorrogas/${prorrogaId}/avalar`);
}

export function rechazarProrroga(proyectoId: string, prorrogaId: string) {
  return api.patch<Prorroga>(`/proyectos/${proyectoId}/prorrogas/${prorrogaId}/rechazar`);
}

export function aplicarProrroga(proyectoId: string, prorrogaId: string) {
  return api.patch<Prorroga>(`/proyectos/${proyectoId}/prorrogas/${prorrogaId}/aplicar`);
}

export function listCierres(proyectoId: string) {
  return api.get<CierreProyecto[]>(`/proyectos/${proyectoId}/cierres`);
}

export function solicitarCierre(proyectoId: string) {
  return api.post<CierreProyecto>(`/proyectos/${proyectoId}/cierres/solicitar`);
}

export function emitirCertificado(
  proyectoId: string,
  cierreId: string,
  body: { certificado_aval_url: string; observaciones?: string },
) {
  return api.patch<CierreProyecto>(
    `/proyectos/${proyectoId}/cierres/${cierreId}/emitir-certificado`,
    body,
  );
}

export function observarCierre(
  proyectoId: string,
  cierreId: string,
  body: { observaciones: string },
) {
  return api.patch<CierreProyecto>(
    `/proyectos/${proyectoId}/cierres/${cierreId}/observar`,
    body,
  );
}