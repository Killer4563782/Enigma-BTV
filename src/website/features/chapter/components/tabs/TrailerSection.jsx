import { useContent } from '../../../../core/services/contentService.jsx';
import '../../../../styles/tabs/trailer.css';
import '../../../../styles/tabs/shared.css';

export default function TrailerSection({ chapter }) {
  const { copy } = useContent();
  return (
    <div>
      <h2 className="section-heading" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
        Trailer &amp; Teaser
      </h2>
      <div className="trailer-wrap">
        {chapter.trailerId ? (
          <div className="trailer-embed">
            <iframe loading="lazy"
              src={`https://www.youtube.com/embed/${chapter.trailerId}?rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${chapter.title} Trailer`}
            />
          </div>
        ) : (
          <div className="trailer-placeholder">
            <span>▶</span>
            <span>{copy.trailerEmpty}</span>
          </div>
        )}
      </div>
    </div>
  );
}
