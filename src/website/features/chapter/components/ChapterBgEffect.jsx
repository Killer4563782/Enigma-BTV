/** Lightweight atmosphere shared by every chapter theme; colors come from the panel. */
const MOTES = Array.from({ length: 14 }, (_, index) => ({
  left: `${(index * 37 + 5) % 100}%`,
  top: `${(index * 23 + 7) % 100}%`,
  delay: `${-index * 2.7}s`,
  duration: `${15 + (index % 5) * 3}s`,
}));

export default function ChapterBgEffect() {
  return (
    <div className="cv-atmosphere" aria-hidden="true">
      <div className="cv-wisp cv-wisp--chapter" />
      <div className="cv-wisp cv-wisp--void" />
      {MOTES.map((mote, index) => (
        <span
          key={index}
          className="cv-mote"
          style={{
            left: mote.left,
            top: mote.top,
            animationDelay: mote.delay,
            animationDuration: mote.duration,
          }}
        />
      ))}
    </div>
  );
}
