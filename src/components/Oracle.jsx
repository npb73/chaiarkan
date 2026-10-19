/**
 * Панель «Звёздного оракула» рядом с паутинкой.
 * Содержимое статичное: как это работает и главная кнопка — предсказание.
 * Имя созвездия и выбор колоды показываются в самом предсказании.
 */
export default function Oracle({ fresh, onPredict, onShowAgain, onRandom, onReset, onShare }) {
  return (
    <aside className="oracle oracle-static">
      <div className="oracle-kicker">
        <span className="dot" /> Звёздный оракул · 卜
      </div>
      <h2 className="oracle-name">Спросите небо о своём чае</h2>

      <ol className="oracle-steps">
        <li>
          <span>
            <b>Соберите созвездие.</b> Тяните звёзды от центра: дальше от центра — ярче нота во вкусе.
          </span>
        </li>
        <li>
          <span>
            <b>Спросите оракула.</b> Колода вытянет сорта, чьи созвездия ближе всего к вашему.
          </span>
        </li>
        <li>
          <span>
            <b>Закажите свой чай</b> прямо с карты, которая выпала.
          </span>
        </li>
      </ol>

      <button className="btn btn-gold btn-oracle" onClick={fresh ? onShowAgain : onPredict}>
        <Sparkle />
        <span>{fresh ? 'Посмотреть карты' : 'Получить предсказание'}</span>
      </button>

      <div className="oracle-links">
        <button className="link-btn" onClick={onRandom}>
          Случайное небо
        </button>
        <span aria-hidden="true">·</span>
        <button className="link-btn" onClick={onShare}>
          Поделиться
        </button>
        <span aria-hidden="true">·</span>
        <button className="link-btn" onClick={onReset}>
          Сбросить
        </button>
      </div>
    </aside>
  );
}

export function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const Sparkle = () => (
  <svg viewBox="-1 -1 2 2" width="18" height="18" aria-hidden="true">
    <path
      d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
      fill="currentColor"
    />
  </svg>
);
