// Отправка заказа.
// Если при сборке задан адрес приёма заказов (VITE_ORDER_ENDPOINT в файле .env),
// заказ уходит туда POST-запросом в JSON. Без него форма работает в демо-режиме:
// заказ сохраняется только в браузере посетителя.

const ENDPOINT = (import.meta.env && import.meta.env.VITE_ORDER_ENDPOINT) || '';

export const IS_DEMO = !ENDPOINT;

export const PACKS = [
  { id: '25', label: '25 г', grams: 25 },
  { id: '50', label: '50 г', grams: 50 },
  { id: '100', label: '100 г', grams: 100 },
  { id: '250', label: '250 г', grams: 250 },
];

export const DELIVERY = [
  { id: 'courier', label: 'Курьер', addressLabel: 'Адрес доставки' },
  { id: 'pickup', label: 'Пункт выдачи', addressLabel: 'Адрес или код пункта выдачи' },
  { id: 'post', label: 'Почта России', addressLabel: 'Адрес и индекс' },
];

export function makeOrderId() {
  const n = Date.now().toString(36).slice(-4).toUpperCase();
  const r = Math.floor(Math.random() * 36 ** 2)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0');
  return `ЧА-${n}${r}`;
}

/** Телефон в виде +7 (999) 123-45-67 по мере ввода. */
export function formatPhone(raw) {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1);
  if (d[0] !== '7') d = '7' + d;
  d = d.slice(0, 11);
  const p = d.slice(1);
  // Закрывающую скобку ставим только когда есть следующие цифры — иначе её нельзя стереть
  let out = '+7';
  if (p.length) out += ` (${p.slice(0, 3)}`;
  if (p.length > 3) out += `) ${p.slice(3, 6)}`;
  if (p.length > 6) out += `-${p.slice(6, 8)}`;
  if (p.length > 8) out += `-${p.slice(8, 10)}`;
  return out;
}

export const phoneDigits = (s) => s.replace(/\D/g, '');

export async function submitOrder(order) {
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
    return order;
  }
  // Демо-режим: имитируем отправку и сохраняем заказ локально
  await new Promise((r) => setTimeout(r, 700));
  try {
    const list = JSON.parse(localStorage.getItem('chaiarkan-orders') || '[]');
    list.push(order);
    localStorage.setItem('chaiarkan-orders', JSON.stringify(list.slice(-20)));
  } catch {
    /* хранилище недоступно — не страшно */
  }
  return order;
}

const CONTACT_KEY = 'chaiarkan-contact';
export function loadContact() {
  try {
    return JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}');
  } catch {
    return {};
  }
}
export function saveContact(c) {
  try {
    if (!c) {
      localStorage.removeItem(CONTACT_KEY);
      return;
    }
    localStorage.setItem(CONTACT_KEY, JSON.stringify(c));
  } catch {
    /* noop */
  }
}
