/** Панель «Звёздного оракула» рядом с паутинкой: имя созвездия и кнопка предсказания. */
export default function Oracle({ constellation, touched, prediction, stale, onPredict, onShowAgain, onRandom, onReset, onShare }) {
  const fresh = prediction && !stale;
  return (
    <aside className="oracle" aria-live="polite">
      <div className="oracle-kicker">
        <span className="dot" /> Ваше созвездие
      </div>
      <h2 className="oracle-name">{constellation.name}</h2>
      <div className="oracle-meta">
        <span>{constellation.glow}</span>
        <span>·</span>
        <span>
          {constellation.bright} {plural(constellation.bright, 'яркая звезда', 'яркие звёзды', 'ярких звёзд')}
        </span>
        <span>·</span>
        <span className="mono">{constellation.code}</span>
      </div>

      <div className="oracle-tea oracle-empty">
        <div className={`oracle-empty-glyph ${touched ? 'is-ready' : ''}`} aria-hidden="true">
          {touched ? '卜' : '茶'}
        </div>
        {!touched ? (
          <>
            <div className="oracle-label">Небо ещё молчит</div>
            <p className="oracle-desc">
              Потяните любую звезду от центра к краю: сильнее те ноты, которые вы любите, слабее те, что не по душе.
              Когда созвездие сложится, оракул вытянет для вас карты из чайной колоды.
            </p>
            <button className="btn btn-ghost" onClick={onRandom}>
              <Sparkle /> Подсказать случайное небо
            </button>
          </>
        ) : (
          <>
            <div className="oracle-label">{fresh ? 'Карты уже вытянуты' : 'Созвездие складывается'}</div>
            <p className="oracle-desc">
              {fresh
                ? 'Колода ответила на это небо. Взгляните на карты ещё раз или измените звёзды и спросите снова.'
                : 'Двигайте звёзды, пока небо не станет вашим. Затем спросите оракула: колода вытянет сорта, чьи созвездия ближе всего к вашему.'}
            </p>
            <div className="oracle-cta">
              {fresh ? (
                <button className="btn btn-gold btn-big" onClick={onShowAgain}>
                  <Sparkle /> Посмотреть карты
                </button>
              ) : (
                <button className="btn btn-gold btn-big btn-predict" onClick={onPredict}>
                  <Sparkle /> {prediction ? 'Новое предсказание' : 'Получить предсказание'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {touched && (
        <div className="oracle-actions">
          <button className="btn btn-ghost" onClick={onRandom}>
            <Sparkle /> Случайное небо
          </button>
          <button className="btn btn-ghost" onClick={onShare}>
            <LinkIcon /> Поделиться
          </button>
          <button className="btn btn-ghost" onClick={onReset}>
            Сбросить
          </button>
        </div>
      )}
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
  <svg viewBox="-1 -1 2 2" width="14" height="14" aria-hidden="true">
    <path
      d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
      fill="currentColor"
    />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);
