"use client";

import { useQuery } from "@tanstack/react-query";
import { listCatalogoItems, type CatalogoSlug } from "@/lib/api/catalogos";

/** Los catálogos casi no cambian: cache larga (10 min) para no repetir 20 fetches por form. */
export function useCatalogo(catalogo: CatalogoSlug) {
  return useQuery({
    queryKey: ["catalogos", catalogo],
    queryFn: () => listCatalogoItems(catalogo),
    staleTime: 10 * 60 * 1000,
  });
}

/** Resuelve el `nombre` de un ítem de catálogo a partir de su id, para vistas de solo lectura. */
export function useCatalogoLabel(
  catalogo: CatalogoSlug,
  id?: number | null,
): string | undefined {
  const { data } = useCatalogo(catalogo);
  if (!id || !data) return undefined;
  const item = data.find((i) => i.id === id);
  return (item?.nombre as string | undefined) ?? item?.codigo;
}