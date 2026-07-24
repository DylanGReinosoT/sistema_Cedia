import { z } from "zod";

/**
 * `z.coerce.number()` convierte `""` a `0` (`Number("") === 0` en JS), no a `NaN`. Eso rompe
 * los campos numéricos OPCIONALES alimentados por un `<select>`/`<input type="number">` que el
 * usuario deja vacío: en vez de "no se mandó nada", se envía literalmente `0` — y si el campo es
 * una FK (ej. `programa_postgrado_id`, `pais_id`, `externo_institucion_id`), el backend lo
 * rechaza con "violación de llave foránea" porque no existe el id `0`.
 *
 * Estos helpers tratan `""`/`null` como "sin proporcionar" ANTES de coercionar, así el campo
 * queda `undefined` (se omite del body) en vez de `0`.
 */
export function optionalCoercedNumber() {
  return z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  );
}

export function optionalCoercedInt() {
  return z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().int().optional(),
  );
}
