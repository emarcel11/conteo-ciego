export function calcularBotellas(cajas, mas, menos, pack) {
  return (cajas * pack) + mas - menos;
}
 
export function iniciales(nombre) {
 
  if (!nombre) return "S-R";
 
  const partes = nombre.split(" ");
 
  const first = partes[0][0].toUpperCase();
  const last = partes.length > 1 ? partes[1][0].toUpperCase() : "R";
 
  return first + "-" + last;
}
 