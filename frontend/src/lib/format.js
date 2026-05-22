// Brazilian masks & validators

export const onlyDigits = (s) => (s || "").replace(/\D/g, "");

export function maskCPF(v) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCEP(v) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskCard(v) {
  const d = onlyDigits(v).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function maskExpiry(v) {
  const d = onlyDigits(v).slice(0, 4);
  return d.replace(/(\d{2})(\d)/, "$1/$2");
}

export function validateCPF(cpf) {
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

export function formatBRL(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
