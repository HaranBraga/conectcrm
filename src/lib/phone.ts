/** Remove tudo que não é dígito. Use no onChange dos inputs de telefone. */
export function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

/** Garante prefixo 55 (Brasil). */
export function withBR(phone: string): string {
  const d = onlyDigits(phone);
  return d.startsWith("55") ? d : `55${d}`;
}

/** Tira o prefixo 55 (pra exibir/editar sem o DDI). */
export function stripBR(phone: string): string {
  const d = onlyDigits(phone);
  return d.startsWith("55") ? d.slice(2) : d;
}
