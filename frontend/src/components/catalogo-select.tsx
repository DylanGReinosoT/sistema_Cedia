import { forwardRef } from "react";
import { useCatalogo } from "@/hooks/use-catalogos";
import { Select } from "@/components/ui/input";
import type { CatalogoSlug } from "@/lib/api/catalogos";

export const CatalogoSelect = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    catalogo: CatalogoSlug;
    placeholder?: string;
    labelKey?: string;
  }
>(({ catalogo, placeholder = "Selecciona una opción", labelKey = "nombre", ...props }, ref) => {
  const { data, isLoading } = useCatalogo(catalogo);

  return (
    <Select ref={ref} disabled={isLoading || props.disabled} {...props}>
      <option value="">{isLoading ? "Cargando…" : placeholder}</option>
      {data?.map((item) => (
        <option key={item.id} value={item.id}>
          {String(item[labelKey] ?? item.nombre ?? item.codigo ?? item.id)}
        </option>
      ))}
    </Select>
  );
});
CatalogoSelect.displayName = "CatalogoSelect";