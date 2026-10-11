import { useState } from 'react';
import { useContent } from '../../../core/services/contentService.jsx';
import '../styles/QASection.css';

export default function QASection() {
  const { qa, copy } = useContent();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const categories = [...new Set(qa.map(item => item.category))];
  const activeCategory = categories.includes(category) ? category : '';
  const query = search.trim().toLowerCase();
  const filtered = qa.filter(item => (!activeCategory || item.category === activeCategory) && `${item.question} ${item.answer}`.toLowerCase().includes(query));
  return (
    <section className="page-section qa-section" aria-labelledby="qa-title">
      <header className="qa-header"><span className="qa-rune" aria-hidden="true">✧</span><p>{copy.qaSubtitle}</p><h2 id="qa-title">{copy.qaTitle}</h2></header>
      <div className="qa-layout">
        <aside className="qa-index">
          <span className="qa-index-label">THE FIELD GUIDE</span><h3>{copy.qaIntro}</h3><p>{copy.qaDescription}</p>
          <div className="qa-filters" role="group" aria-label="Question categories">
            {['', ...categories].map(cat => <button key={cat} aria-pressed={activeCategory === cat} onClick={() => { setCategory(cat); setOpenId(null); }}><span>{cat || 'All questions'}</span><b>{qa.filter(item => !cat || item.category === cat).length.toString().padStart(2, '0')}</b></button>)}
          </div>
          <div className="qa-contact"><span aria-hidden="true">◇</span><p>{copy.qaContact}</p><a href={copy.discordUrl} target="_blank" rel="noreferrer">{copy.discordLabel} ↗</a></div>
        </aside>
        <div className="qa-results">
          <label className="qa-search-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input type="search" aria-label="Search questions and answers" placeholder="Search the field guide…" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <p className="qa-results-count" role="status">{filtered.length} {filtered.length === 1 ? 'answer' : 'answers'} / {activeCategory || 'All questions'}</p>
          <div className="qa-list">
            {filtered.map((item, index) => <QAItem key={item.id} item={item} index={index} open={openId === item.id} onToggle={() => setOpenId(openId === item.id ? null : item.id)} />)}
            {!filtered.length && <div className="qa-empty"><span aria-hidden="true">◇</span><h3>No signals found</h3><p>Try another phrase or category.</p><button onClick={() => { setSearch(''); setCategory(''); }}>Reset search & filters</button></div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function QAItem({ item, index, open, onToggle }) {
  return (
    <article className={`qa-item${open ? ' is-open' : ''}`}>
      <h3><button id={`question-${item.id}`} className="qa-question" aria-expanded={open} aria-controls={`answer-${item.id}`} onClick={onToggle}>
        <span className="qa-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="qa-question-copy"><small>{item.category}</small><span>{item.question}</span></span><span className="qa-toggle" aria-hidden="true">+</span>
      </button></h3>
      <div id={`answer-${item.id}`} className="qa-answer-wrap" role="region" aria-labelledby={`question-${item.id}`} aria-hidden={!open} inert={!open}><div><p>{item.answer}</p></div></div>
    </article>
  );
}
