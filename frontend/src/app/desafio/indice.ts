/**
 * Modelos que tienen Modo Desafío. Es una lista liviana (sin importar los modelos) para que la barra
 * superior y la página del simulador muestren el botón sin cargar el banco de retos; una prueba
 * comprueba que coincide con challengesData.
 */
export const MODELOS_CON_RETOS: ReadonlySet<string> = new Set([
  'micro2/slutsky',
  'micro2/monopolio',
  'micro2/oligopolio',
  'micro2/edgeworth',
  'macro2/is-lm',
  'macro2/mundell-fleming',
  'macro2/da-oa',
  'macro2/phillips',
  'macro2/solow',
]);

export const hayDesafio = (materia: string, sim: string): boolean => MODELOS_CON_RETOS.has(`${materia}/${sim}`);
