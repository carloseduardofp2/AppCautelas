const colator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
export const compararNatural = (a, b) => colator.compare(String(a ?? '').trim(), String(b ?? '').trim());
