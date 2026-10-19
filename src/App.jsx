import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NOTES, MAX } from './data/notes.js';
import {
  decodeValues,
  describeConstellation,
  encodeValues,
  randomConstellation,
  rankTeas,
} from './lib/constellation.js';
import Starfield from './components/Starfield.jsx';
import FlavorWeb from './components/FlavorWeb.jsx';
import Oracle from './components/Oracle.jsx';
import Prediction, { drawCards } from './components/Prediction.jsx';
import OrderModal from './components/OrderModal.jsx';
import { Catalog, Footer, Header, NotesAtlas, Ritual, TeaScroll } from './components/Sections.jsx';

const START = new Array(NOTES.length).fill(4);
const ease = (t) => 1 - Math.pow(1 - t, 3);

function readFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search).get('sky');
    return decodeValues(p);
  } catch {
    return null;
  }
}

// Телефон — всегда одна карта; три карты помещаются только на широком экране
const PHONE_QUERY = '(max-width: 860px), (pointer: coarse) and (max-width: 900px)';

function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const m = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

const sameSky = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.05);

export default function App() {
  const fromUrl = useMemo(readFromUrl, []);
  const [values, setValues] = useState(fromUrl || START);
  const [touched, setTouched] = useState(Boolean(fromUrl));
  const [toast, setToast] = useState(null);
  const anim = useRef(0);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const ranking = useMemo(() => rankTeas(values), [values]);
  const constellation = useMemo(() => describeConstellation(values), [values]);
  const isPhone = useIsPhone();
  const [prediction, setPrediction] = useState(null); // { values, cards, name }
  const [deckOpen, setDeckOpen] = useState(false);
  const [chosen, setChosen] = useState(null); // { tea, values } — для свитка сорта
  const [orderFor, setOrderFor] = useState(null); // сорт, который заказывают
  const stale = prediction ? !sameSky(prediction.values, values) : false;

  // Значения в адресе — чтобы созвездием можно было поделиться
  useEffect(() => {
    if (!touched) return;
    const id = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('sky', encodeValues(values));
      try {
        window.history.replaceState(null, '', url);
      } catch {
        /* в песочнице адрес может быть недоступен — не страшно */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [values, touched]);

  const setOne = useCallback((i, v) => {
    cancelAnimationFrame(anim.current);
    setValues((prev) => {
      if (prev[i] === v) return prev;
      const next = prev.slice();
      next[i] = v;
      return next;
    });
  }, []);

  const animateTo = useCallback((target, ms = 750) => {
    cancelAnimationFrame(anim.current);
    const from = valuesRef.current.slice();
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = ease(k);
      setValues(from.map((v, i) => v + (target[i] - v) * e));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  const toastTimer = useRef(0);
  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const toTop = () => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const tryTea = (tea) => {
    setTouched(true);
    animateTo(tea.profile);
    toTop();
    flash(`Созвездие «${tea.name}» перенесено на вашу карту`);
  };

  const ignite = (i) => {
    setTouched(true);
    const target = valuesRef.current.slice();
    target[i] = MAX;
    animateTo(target, 600);
    toTop();
    flash(`Звезда «${NOTES[i].name}» зажжена`);
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sky', encodeValues(values));
    url.hash = '';
    const text = prediction && !stale ? `${constellation.name} — мой чай: ${prediction.cards[0].tea.name}` : constellation.name;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'ЧайАркан', text, url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      flash('Ссылка на созвездие скопирована');
    } catch {
      flash('Скопируйте адрес страницы — в нём ваше созвездие');
    }
  };

  const predict = () => {
    const snapshot = values.slice();
    // На телефоне — всегда одна карта, на большом экране — от одной до трёх
    const cards = drawCards(ranking, isPhone ? 1 : 3);
    setPrediction({ values: snapshot, cards, name: constellation.name });
    setChosen({ tea: cards[0].tea, values: snapshot });
    setDeckOpen(true);
  };

  const openScroll = (tea) => {
    setChosen({ tea, values: prediction.values });
    setDeckOpen(false);
    setTimeout(() => document.getElementById('tea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <>
      <Starfield />
      <div className="app" id="top">
        <Header />

        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-grid">
              <div className="hero-head">
                <h1 id="hero-title" className="hero-title">
                  Соберите своё <em>чайное созвездие</em>
                </h1>
                <p className="hero-sub">
                  Двенадцать звёзд — двенадцать нот вкуса. Передвиньте их мышкой или пальцем, и небо подскажет ваш сорт
                  китайского чая.
                </p>
              </div>

              <FlavorWeb
                values={values}
                onChange={setOne}
                touched={touched}
                onFirstTouch={() => setTouched(true)}
              />
              <Oracle
                constellation={constellation}
                touched={touched}
                prediction={prediction}
                stale={stale}
                onPredict={predict}
                onShowAgain={() => setDeckOpen(true)}
                onRandom={() => {
                  setTouched(true);
                  animateTo(randomConstellation());
                }}
                onReset={() => {
                  animateTo(START);
                  setTouched(false);
                  const url = new URL(window.location.href);
                  url.searchParams.delete('sky');
                  try {
                    window.history.replaceState(null, '', url);
                  } catch {
                    /* noop */
                  }
                }}
                onShare={share}
              />
            </div>
          </section>

          <TeaScroll chosen={chosen} onOrder={setOrderFor} />
          <NotesAtlas values={values} onIgnite={ignite} />
          <Catalog onTry={tryTea} />
          <Ritual />
        </main>

        <Footer />
      </div>

      {deckOpen && prediction && (
        <Prediction
          key={prediction.values.join(',') + prediction.cards.length}
          cards={prediction.cards}
          values={prediction.values}
          constellationName={prediction.name}
          onClose={() => setDeckOpen(false)}
          onOpenScroll={openScroll}
          onOrder={setOrderFor}
        />
      )}

      {orderFor && (
        <OrderModal
          key={orderFor.id}
          tea={orderFor}
          values={prediction?.values || values}
          constellation={constellation}
          onClose={() => setOrderFor(null)}
        />
      )}

      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}
