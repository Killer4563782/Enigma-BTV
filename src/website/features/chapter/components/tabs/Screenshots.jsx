import { useContent } from '../../../../core/services/contentService.jsx';
import { useState } from 'react';
import '../../../../styles/tabs/screenshots.css';
import '../../../../styles/tabs/shared.css';

export default function Screenshots({ chapter }) {
  const { copy } = useContent();
  const [current, setCurrent] = useState(0);
  const shots = chapter.screenshots;
  const total  = shots.length;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  if (total === 0) {
    return (
      <div>
        <h2 className="section-heading" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>Screenshots</h2>
        <div className="trailer-placeholder" style={{ aspectRatio: '3/1' }}>
          <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>🖼</span>
          <span>{copy.galleryEmpty}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-heading" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>Screenshots</h2>
      <div className="carousel-wrap">
        <div className="carousel-stage">
          <img key={current} src={shots[current]} alt={`Screenshot ${current + 1}`} className="carousel-img" />
          {total > 1 && (
            <>
              <button className="carousel-btn carousel-btn--prev" onClick={prev} aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button className="carousel-btn carousel-btn--next" onClick={next} aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
          <div className="carousel-counter">{current + 1} / {total}</div>
        </div>
        {total > 1 && (
          <div className="carousel-thumbs">
            {shots.map((src, i) => (
              <button key={i} aria-label={`View screenshot ${i + 1}`} className={`carousel-thumb${i === current ? ' active' : ''}`} onClick={() => setCurrent(i)}>
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
