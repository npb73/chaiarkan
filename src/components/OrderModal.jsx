import { useEffect, useRef, useState } from 'react';
import { TEAS, TEA_TYPES } from '../data/teas.js';
import {
  DELIVERY,
  IS_DEMO,
  PACKS,
  formatPhone,
  loadContact,
  makeOrderId,
  phoneDigits,
  saveContact,
  submitOrder,
} from '../lib/order.js';
import { encodeValues } from '../lib/constellation.js';
import MiniRadar from './MiniRadar.jsx';
import { DOCS_VERSION, SELLER, docHref } from '../data/legal.js';

/** Окно заказа: выбранный сорт, фасовка, контакты, доставка. */
export default function OrderModal({ tea: initialTea, values, constellation, onClose }) {
  const saved = useRef(loadContact()).current;
  const [teaId, setTeaId] = useState(initialTea.id);
  const [pack, setPack] = useState('50');
  const [qty, setQty] = useState(1);
  const [name, setName] = useState(saved.name || '');
  const [phone, setPhone] = useState(saved.phone || '');
  const [email, setEmail] = useState(saved.email || '');
  const [delivery, setDelivery] = useState(saved.delivery || 'courier');
  const [city, setCity] = useState(saved.city || '');
  const [address, setAddress] = useState(saved.address || '');
  const [comment, setComment] = useState('');
  // Согласие на обработку ПДн — отдельной отметкой, не вместе с условиями продажи (152-ФЗ, ред. с 01.09.2025)
  const [agree, setAgree] = useState(false);
  const [terms, setTerms] = useState(false);
  const [remember, setRemember] = useState(Boolean(saved.name || saved.phone));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [done, setDone] = useState(null);
  const firstRef = useRef(null);
  const formRef = useRef(null);

  const tea = TEAS.find((t) => t.id === teaId) || initialTea;
  const type = TEA_TYPES[tea.type];
  const del = DELIVERY.find((d) => d.id === delivery);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.legal')) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Напишите, как к вам обращаться';
    if (phoneDigits(phone).length !== 11) e.phone = 'Нужен номер из 10 цифр после +7';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Проверьте адрес почты';
    if (!city.trim()) e.city = 'Укажите город';
    if (address.trim().length < 4) e.address = 'Укажите адрес';
    if (!agree) e.agree = 'Без согласия на обработку данных мы не сможем оформить и доставить заказ';
    if (!terms) e.terms = 'Подтвердите, что ознакомились с условиями продажи';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = formRef.current?.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    const order = {
      id: makeOrderId(),
      createdAt: new Date().toISOString(),
      tea: { id: tea.id, name: tea.name, hanzi: tea.hanzi },
      pack: Number(pack),
      quantity: qty,
      customer: { name: name.trim(), phone, email: email.trim() },
      delivery: { method: delivery, city: city.trim(), address: address.trim() },
      comment: comment.trim(),
      sky: { code: constellation?.code, name: constellation?.name, values: values ? encodeValues(values) : null },
      // фиксация согласий: что именно, в какой редакции и когда подтвердил покупатель
      consents: {
        personalData: { given: true, docVersion: DOCS_VERSION, at: new Date().toISOString() },
        termsAccepted: { given: true, docVersion: DOCS_VERSION, at: new Date().toISOString() },
      },
    };
    setStatus('sending');
    try {
      await submitOrder(order);
      if (remember)
        saveContact({ name: name.trim(), phone, email: email.trim(), delivery, city: city.trim(), address: address.trim() });
      else saveContact(null);
      setDone(order);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const fieldProps = (key) => ({
    'aria-invalid': errors[key] ? 'true' : 'false',
    'aria-describedby': errors[key] ? `err-${key}` : undefined,
  });
  const Err = ({ k }) =>
    errors[k] ? (
      <span className="field-err" id={`err-${k}`}>
        {errors[k]}
      </span>
    ) : null;

  return (
    <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div className="order-backdrop" onClick={onClose} />
      <div className="order-panel" style={{ '--c': type.color }}>
        <button className="order-x" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <div className="order-side">
          <div className="kicker">Заказ · 订</div>
          <div className="order-sky">
            <MiniRadar
              labels
              layers={[
                { values: tea.profile, color: type.color, fill: type.color, fillOpacity: 0.22, width: 1.6 },
                ...(values ? [{ values, color: '#ffe6ad', dashed: true, width: 1.2 }] : []),
              ]}
            />
          </div>
          <div className="order-hanzi">{tea.hanzi}</div>
          <h2 className="order-title" id="order-title">
            {tea.name}
          </h2>
          <div className="order-sub">
            <span className="pill" style={{ '--c': type.color }}>
              {type.name}
            </span>
            <span className="muted">{tea.region}</span>
          </div>
          <p className="order-brew muted">
            Заваривание: {tea.brew.temp}, {tea.brew.dose}
          </p>
        </div>

        {status === 'done' && done ? (
          <div className="order-main order-done" aria-live="polite">
            <div className="order-done-mark" aria-hidden="true">
              ✦
            </div>
            <h3 className="order-done-title">Заказ принят</h3>
            <p className="order-done-id mono">№ {done.id}</p>
            <p>
              {done.tea.name}, {done.pack} г × {done.quantity}. Мы позвоним по номеру <span className="nowrap">{done.customer.phone}</span>, чтобы
              подтвердить заказ и доставку.
            </p>
            {IS_DEMO && (
              <p className="order-note">
                Сайт пока работает в демо-режиме: заказ сохранён только в этом браузере и никуда не отправлен.
              </p>
            )}
            <button className="btn btn-gold" onClick={onClose}>
              Готово
            </button>
          </div>
        ) : (
          <form className="order-main" ref={formRef} onSubmit={onSubmit} noValidate>
            <label className="field">
              <span className="field-label">Сорт</span>
              <select id="order-tea" ref={firstRef} value={teaId} onChange={(e) => setTeaId(e.target.value)}>
                {TEAS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {TEA_TYPES[t.type].name}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <fieldset className="field">
                <legend className="field-label">Фасовка</legend>
                <div className="seg">
                  {PACKS.map((p) => (
                    <label key={p.id} className={`seg-opt ${pack === p.id ? 'on' : ''}`}>
                      <input
                        type="radio"
                        name="pack"
                        id={`order-pack-${p.id}`}
                        value={p.id}
                        checked={pack === p.id}
                        onChange={() => setPack(p.id)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field field-qty">
                <span className="field-label" id="qty-label">
                  Количество
                </span>
                <div className="stepper" role="group" aria-labelledby="qty-label">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Меньше">
                    −
                  </button>
                  <output id="order-qty" aria-live="polite">
                    {qty}
                  </output>
                  <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Больше">
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Имя</span>
                <input
                  id="order-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  {...fieldProps('name')}
                />
                <Err k="name" />
              </label>
              <label className="field">
                <span className="field-label">Телефон</span>
                <input
                  id="order-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  {...fieldProps('phone')}
                />
                <Err k="phone" />
              </label>
            </div>

            <label className="field">
              <span className="field-label">
                Почта <span className="muted">— необязательно</span>
              </span>
              <input
                id="order-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...fieldProps('email')}
              />
              <Err k="email" />
            </label>

            <fieldset className="field">
              <legend className="field-label">Доставка</legend>
              <div className="seg">
                {DELIVERY.map((d) => (
                  <label key={d.id} className={`seg-opt ${delivery === d.id ? 'on' : ''}`}>
                    <input
                      type="radio"
                      name="delivery"
                      id={`order-del-${d.id}`}
                      value={d.id}
                      checked={delivery === d.id}
                      onChange={() => setDelivery(d.id)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field-row">
              <label className="field field-city">
                <span className="field-label">Город</span>
                <input
                  id="order-city"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  {...fieldProps('city')}
                />
                <Err k="city" />
              </label>
              <label className="field field-grow">
                <span className="field-label">{del.addressLabel}</span>
                <input
                  id="order-address"
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  {...fieldProps('address')}
                />
                <Err k="address" />
              </label>
            </div>

            <label className="field">
              <span className="field-label">
                Комментарий <span className="muted">— необязательно</span>
              </span>
              <textarea id="order-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>

            <div className="consents">
              <label className="check">
                <input
                  type="checkbox"
                  id="order-agree"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  {...fieldProps('agree')}
                />
                <span>
                  Даю <a href={docHref('consent')}>согласие на обработку персональных данных</a> для оформления и
                  доставки заказа. С <a href={docHref('privacy')}>Политикой обработки персональных данных</a>{' '}
                  ознакомлен(а).
                </span>
              </label>
              <Err k="agree" />

              <label className="check">
                <input
                  type="checkbox"
                  id="order-terms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  {...fieldProps('terms')}
                />
                <span>
                  Ознакомлен(а) с <a href={docHref('terms')}>условиями продажи, доставки и возврата</a>.
                </span>
              </label>
              <Err k="terms" />

              <label className="check check-soft">
                <input
                  type="checkbox"
                  id="order-remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Запомнить мои данные на этом устройстве — они останутся только в вашем браузере</span>
              </label>
            </div>

            <p className="order-legal muted small">
              Заказ — это предложение заключить договор. Продавец ({SELLER.shortName}) подтвердит его по телефону,
              сообщит номер заказа, цену, стоимость и срок доставки. Отказаться от товара можно до получения и в течение
              7 дней после.
            </p>

            {status === 'error' && (
              <p className="field-err" role="alert">
                Не удалось отправить заказ. Проверьте подключение к интернету и попробуйте ещё раз.
              </p>
            )}

            <div className="order-actions">
              <button type="submit" className="btn btn-gold btn-big" disabled={status === 'sending'}>
                {status === 'sending' ? 'Отправляем…' : 'Отправить заказ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
