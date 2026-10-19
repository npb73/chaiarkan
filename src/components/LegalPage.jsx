import { useEffect, useRef } from 'react';
import { DOCS, DOC_LIST, docHref } from '../data/legal.js';

/** Страница юридического документа поверх сайта (адрес вида #doc-privacy). */
export default function LegalPage({ id, onClose }) {
  const doc = DOCS[id];
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.scrollTo(0, 0);
    ref.current?.querySelector('h1')?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [id, onClose]);

  if (!doc) return null;

  return (
    <div className="legal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="legal-title">
      <div className="legal-inner">
        <button className="btn btn-ghost legal-back" onClick={onClose}>
          ← Вернуться на сайт
        </button>
        <article className="legal-doc">
          <div className="kicker">Документы · 文书</div>
          <h1 id="legal-title" tabIndex={-1}>
            {doc.title}
          </h1>
          <p className="legal-lead">{doc.lead}</p>
          {doc.sections.map(([title, items]) => (
            <section key={title}>
              <h2>{title}</h2>
              {items.map((it, k) =>
                Array.isArray(it) ? (
                  <ul key={k}>
                    {it.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={k}>{it}</p>
                ),
              )}
            </section>
          ))}
        </article>
        <nav className="legal-nav" aria-label="Другие документы">
          {DOC_LIST.filter(([d]) => d !== id).map(([d, label]) => (
            <a key={d} href={docHref(d)}>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
