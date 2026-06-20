// Estado global del negocio activo (mates / alpargatas).
const KEY = 'jicrea_business';
export const state = {
  business: localStorage.getItem(KEY) || 'mates',
};
export function setBusiness(b) {
  state.business = b;
  localStorage.setItem(KEY, b);
}
export const BUSINESS_LABEL = { mates: 'Mates', alpargatas: 'Alpargatas' };
