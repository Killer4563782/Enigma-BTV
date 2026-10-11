// Shared form metadata and server validation. Only editorial content is managed.
const text = (label, max = 1000) => ({ label, type: 'text', max });
const prose = label => ({ label, type: 'textarea', max: 50000 });
const choice = (label, options) => ({ label, type: 'select', options });
const color = label => ({ label, type: 'color' });
const toggle = label => ({ label, type: 'checkbox' });
export const CONTENT_FIELDS = {
  chapters: {
    title: text('Title'), subtitle: text('Chapter label'), description: prose('Description'),
    storyTitle: text('Story heading'), lore: prose('Story'), roadmapText: prose('Roadmap description'),
    image: { ...text('Cover image'), type: 'asset' }, screenshots: { label: 'Gallery images (one path or URL per line)', type: 'assets' },
    trailerId: { ...text('YouTube video ID', 11), type: 'video' },
    cardColor: color('Info card color'), color: color('Atmosphere color'), accentColor: color('Accent color'),
    status: choice('Availability', ['available', 'coming-soon']), published: toggle('Visible on the public website'),
  },
  team: {
    name: text('Name', 100), role: text('Role / rank', 160), description: prose('Biography'),
    isCore: toggle('Core team member'), representation: choice('Representation', ['star', 'planet']),
    planetColor: color('Planet / star color'), avatar: { ...text('Avatar image'), type: 'asset' },
    disciplines: { label: 'Disciplines (one per line)', type: 'list' },
    socials: { label: 'Social profiles', type: 'socials' },
  },
  announcements: { title: text('Title'), epicTag: text('Signal label'), date: { label: 'Date', type: 'date' }, content: prose('Announcement'), published: toggle('Published') },
  qa: { question: text('Question'), category: text('Category', 100), answer: prose('Answer'), published: toggle('Published') },
};
export const COPY_GROUPS = {
  Home: ['heroTag', 'heroDescription', 'exploreLabel', 'maxPlayers', 'scrollLabel', 'announcementsTitle', 'announcementsSubtitle'],
  Chapters: ['chaptersSubtitle', 'roadmapTitle', 'roadmapDescription', 'roadmapEnd', 'chapterStoryLabel', 'chapterStoryEmpty', 'chapterMeta', 'trailerEmpty', 'galleryEmpty'],
  'Q&A': ['qaTitle', 'qaSubtitle', 'qaIntro', 'qaDescription', 'qaContact', 'discordLabel', 'discordUrl'],
  'Team & Credits': ['teamEyebrow', 'teamTitle', 'teamDescription', 'teamSignoff'],
};
export const copyLabel = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
export const safeAsset = value => !value || /^assets\/[a-z0-9_./ -]+$/i.test(value) && !value.includes('..') || /^https:\/\/[^\s]+$/i.test(value);

export function validateContent(content) {
  const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!content || content.version !== 1) invalid('Unsupported content version.');
  for (const [collection, fields] of Object.entries(CONTENT_FIELDS)) {
    const items = content[collection];
    if (!Array.isArray(items) || items.length > 200) invalid(`Invalid ${collection} collection (maximum 200).`);
    const ids = new Set();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !/^[\w-]{1,100}$/.test(item.id) || ids.has(item.id)) invalid(`Invalid or duplicate ${collection} ID.`);
      ids.add(item.id);
      for (const [key, field] of Object.entries(fields)) {
        const value = item[key];
        const label = `${collection}: ${field.label}`;
        if (field.type === 'checkbox') { if (typeof value !== 'boolean') invalid(`${label} must be true or false.`); }
        else if (field.type === 'select') { if (!field.options.includes(value)) invalid(`Invalid ${label}.`); }
        else if (['assets', 'list'].includes(field.type)) {
          if (!Array.isArray(value) || value.length > 50 || value.some(v => typeof v !== 'string' || v.length > 1000 || field.type === 'assets' && !safeAsset(v.trim()))) invalid(`Invalid ${label}.`);
        } else if (field.type === 'socials') {
          if (!value || typeof value !== 'object' || Array.isArray(value) || Object.entries(value).some(([k, v]) => !['discord', 'github', 'youtube', 'twitter', 'website'].includes(k) || typeof v !== 'string' || v.length > 1000 || k !== 'discord' && v && !/^https:\/\/[^\s]+$/i.test(v))) invalid(`Invalid ${label}. Use HTTPS URLs for links.`);
        } else {
          if (typeof value !== 'string' || value.length > (field.max || 1000)) invalid(`Invalid ${label}.`);
          if (field.type === 'color' && !/^#[a-f0-9]{6}$/i.test(value)) invalid(`${label} needs a six-digit hex color.`);
          if (field.type === 'asset' && !safeAsset(value)) invalid(`${label} must be an assets/ path or HTTPS URL.`);
          if (field.type === 'video' && value && !/^[\w-]{11}$/.test(value)) invalid('Use an 11-character YouTube video ID.');
          if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))) invalid('Use a valid announcement date.');
        }
      }
      for (const key of collection === 'qa' ? ['question', 'answer', 'category'] : collection === 'team' ? ['name', 'role'] : ['title'])
        if (!item[key].trim()) invalid(`${collection}: ${key} is required.`);
    }
    if (collection === 'team' && new Set(items.map(item => item.name.trim().toLowerCase())).size !== items.length) invalid('Team names must be unique.');
  }
  if (content.chapters.length !== 6 || content.chapters.some((ch, i) => ch.id !== `chapter-${i + 1}` || ch.number !== ['I', 'II', 'III', 'IV', 'V', 'VI'][i])) invalid('Keep the six chapters in their original order. Use visibility to hide chapters.');
  for (const key of Object.values(COPY_GROUPS).flat())
    if (typeof content.copy?.[key] !== 'string' || content.copy[key].length > 10000) invalid(`Invalid website text: ${key}.`);
  if (!/^https:\/\/[^\s]+$/i.test(content.copy.discordUrl)) invalid('The community link must use HTTPS.');
  return {
    version: 1,
    ...Object.fromEntries(Object.entries(CONTENT_FIELDS).map(([collection, fields]) => [collection, content[collection].map(item => ({
      id: item.id,
      ...(collection === 'chapters' ? { number: item.number, theme: typeof item.theme === 'string' ? item.theme : 'echo' } : {}),
      ...Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, ['assets', 'list'].includes(field.type) ? item[key].map(value => value.trim()).filter(Boolean) : item[key]])),
    }))])),
    copy: Object.fromEntries(Object.values(COPY_GROUPS).flat().map(key => [key, content.copy[key]])),
  };
}
