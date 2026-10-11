import { useContent } from '../../../../core/services/contentService.jsx';
import '../../../../styles/tabs/chapter-info.css';
import '../../../../styles/tabs/shared.css';

export default function ChapterInfo({ chapter, onNavigate }) {
  const { copy } = useContent();
  return (
    <div className="ci-root">
      <div className="ci-grid">
        <section className="ci-story" aria-labelledby="chapter-story-title">
          <div className="ci-eyebrow">
            <span aria-hidden="true">✦</span> {copy.chapterStoryLabel}
          </div>
          <h3 id="chapter-story-title">{chapter.storyTitle}</h3>
          <div className="ci-lore">
            {chapter.lore ? (
              chapter.lore
                .split(/\n\s*\n/)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p>{copy.chapterStoryEmpty}</p>
            )}
          </div>
        </section>
        <aside className="ci-discover" aria-label="Explore chapter content">
          <div className="ci-eyebrow">Inside this chapter</div>
          <button
            type="button"
            className="ci-gallery"
            onClick={() => onNavigate('screenshots')}
          >
            <img
              src={chapter.screenshots?.[0] || chapter.image}
              alt=""
              loading="lazy"
            />
            <span className="ci-gallery-label">
              <span>
                Step into the world<strong>Explore the gallery</strong>
              </span>
              <span aria-hidden="true">↗</span>
            </span>
          </button>
        </aside>
      </div>
    </div>
  );
}
