type ScriptureResult = { text: string } | { error: string };

type KjvBook = {
  name: string;
  abbrev: string;
  chapters: string[][];
};

const KJV_DATA_URL = new URL('../data/kjv.json', import.meta.url);

let kjvBooks: KjvBook[] | null = null;
let kjvIndex: Record<string, number> | null = null;
let kjvLoadPromise: Promise<void> | null = null;

const normalizeBookKey = (value: string) => {
  let key = value
    .toLowerCase()
    .replace(/[\.\,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  key = key
    .replace(/^(first|1st|i)\s+/, '1 ')
    .replace(/^(second|2nd|ii)\s+/, '2 ')
    .replace(/^(third|3rd|iii)\s+/, '3 ');

  return key;
};

const registerAlias = (map: Record<string, number>, alias: string, index: number) => {
  const normalized = normalizeBookKey(alias);
  if (!normalized) return;
  map[normalized] = index;
  map[normalized.replace(/\s+/g, '')] = index;
};

const BOOK_ALIAS_GROUPS: Array<{ name: string; aliases: string[] }> = [
  { name: 'Genesis', aliases: ['genesis', 'gen', 'ge', 'gn'] },
  { name: 'Exodus', aliases: ['exodus', 'exod', 'exo', 'ex'] },
  { name: 'Leviticus', aliases: ['leviticus', 'lev', 'lv'] },
  { name: 'Numbers', aliases: ['numbers', 'num', 'nm', 'nb'] },
  { name: 'Deuteronomy', aliases: ['deuteronomy', 'deut', 'deu', 'dt'] },
  { name: 'Joshua', aliases: ['joshua', 'josh', 'jos', 'js'] },
  { name: 'Judges', aliases: ['judges', 'judg', 'jdg', 'jg'] },
  { name: 'Ruth', aliases: ['ruth', 'ru', 'rt', 'rth'] },
  { name: '1 Samuel', aliases: ['1 samuel', '1 sam', '1sa', '1sam'] },
  { name: '2 Samuel', aliases: ['2 samuel', '2 sam', '2sa', '2sam'] },
  { name: '1 Kings', aliases: ['1 kings', '1 king', '1 kgs', '1kgs', '1ki'] },
  { name: '2 Kings', aliases: ['2 kings', '2 king', '2 kgs', '2kgs', '2ki'] },
  { name: '1 Chronicles', aliases: ['1 chronicles', '1 chron', '1 chr', '1ch', '1chr'] },
  { name: '2 Chronicles', aliases: ['2 chronicles', '2 chron', '2 chr', '2ch', '2chr'] },
  { name: 'Ezra', aliases: ['ezra', 'ezr', 'ez'] },
  { name: 'Nehemiah', aliases: ['nehemiah', 'neh', 'ne'] },
  { name: 'Esther', aliases: ['esther', 'est', 'es', 'et'] },
  { name: 'Job', aliases: ['job'] },
  { name: 'Psalms', aliases: ['psalms', 'psalm', 'ps', 'psa', 'pss'] },
  { name: 'Proverbs', aliases: ['proverbs', 'prov', 'prv', 'pr'] },
  { name: 'Ecclesiastes', aliases: ['ecclesiastes', 'eccles', 'eccl', 'ecc'] },
  { name: 'Song of Solomon', aliases: ['song of solomon', 'song of songs', 'song', 'sos', 'canticles', 'canticle'] },
  { name: 'Isaiah', aliases: ['isaiah', 'isa', 'is'] },
  { name: 'Jeremiah', aliases: ['jeremiah', 'jer', 'je', 'jr'] },
  { name: 'Lamentations', aliases: ['lamentations', 'lam', 'la'] },
  { name: 'Ezekiel', aliases: ['ezekiel', 'ezek', 'eze', 'ezk'] },
  { name: 'Daniel', aliases: ['daniel', 'dan', 'da', 'dn'] },
  { name: 'Hosea', aliases: ['hosea', 'hos', 'ho'] },
  { name: 'Joel', aliases: ['joel', 'jl'] },
  { name: 'Amos', aliases: ['amos', 'am'] },
  { name: 'Obadiah', aliases: ['obadiah', 'obad', 'ob'] },
  { name: 'Jonah', aliases: ['jonah', 'jon', 'jh'] },
  { name: 'Micah', aliases: ['micah', 'mic', 'mc'] },
  { name: 'Nahum', aliases: ['nahum', 'nah', 'na'] },
  { name: 'Habakkuk', aliases: ['habakkuk', 'hab'] },
  { name: 'Zephaniah', aliases: ['zephaniah', 'zeph', 'zep'] },
  { name: 'Haggai', aliases: ['haggai', 'hag', 'hg'] },
  { name: 'Zechariah', aliases: ['zechariah', 'zech', 'zec', 'zc'] },
  { name: 'Malachi', aliases: ['malachi', 'mal', 'ml'] },
  { name: 'Matthew', aliases: ['matthew', 'matt', 'mt'] },
  { name: 'Mark', aliases: ['mark', 'mrk', 'mk', 'mr'] },
  { name: 'Luke', aliases: ['luke', 'luk', 'lk'] },
  { name: 'John', aliases: ['john', 'jn', 'jhn'] },
  { name: 'Acts', aliases: ['acts', 'act', 'ac'] },
  { name: 'Romans', aliases: ['romans', 'rom', 'ro', 'rm'] },
  { name: '1 Corinthians', aliases: ['1 corinthians', '1 cor', '1cor', '1co'] },
  { name: '2 Corinthians', aliases: ['2 corinthians', '2 cor', '2cor', '2co'] },
  { name: 'Galatians', aliases: ['galatians', 'gal', 'ga'] },
  { name: 'Ephesians', aliases: ['ephesians', 'eph', 'ep'] },
  { name: 'Philippians', aliases: ['philippians', 'phil', 'php', 'pp'] },
  { name: 'Colossians', aliases: ['colossians', 'col', 'co'] },
  { name: '1 Thessalonians', aliases: ['1 thessalonians', '1 thess', '1thess', '1 th'] },
  { name: '2 Thessalonians', aliases: ['2 thessalonians', '2 thess', '2thess', '2 th'] },
  { name: '1 Timothy', aliases: ['1 timothy', '1 tim', '1tim'] },
  { name: '2 Timothy', aliases: ['2 timothy', '2 tim', '2tim'] },
  { name: 'Titus', aliases: ['titus', 'tit', 'ti'] },
  { name: 'Philemon', aliases: ['philemon', 'philem', 'phm', 'phile'] },
  { name: 'Hebrews', aliases: ['hebrews', 'heb', 'he'] },
  { name: 'James', aliases: ['james', 'jas', 'jm', 'ja'] },
  { name: '1 Peter', aliases: ['1 peter', '1 pet', '1pt', '1pe'] },
  { name: '2 Peter', aliases: ['2 peter', '2 pet', '2pt', '2pe'] },
  { name: '1 John', aliases: ['1 john', '1 jn', '1jn', '1jo'] },
  { name: '2 John', aliases: ['2 john', '2 jn', '2jn', '2jo'] },
  { name: '3 John', aliases: ['3 john', '3 jn', '3jn', '3jo'] },
  { name: 'Jude', aliases: ['jude', 'jud', 'jd'] },
  { name: 'Revelation', aliases: ['revelation', 'rev', 're', 'rv'] },
];

const buildIndex = (books: KjvBook[]) => {
  const index: Record<string, number> = {};
  books.forEach((book, idx) => {
    registerAlias(index, book.name, idx);
    registerAlias(index, book.abbrev, idx);
  });

  BOOK_ALIAS_GROUPS.forEach((group) => {
    const targetIndex = books.findIndex((book) => book.name === group.name);
    if (targetIndex === -1) return;
    group.aliases.forEach((alias) => registerAlias(index, alias, targetIndex));
  });

  return index;
};

const ensureKjvLoaded = async () => {
  if (kjvBooks && kjvIndex) return;
  if (!kjvLoadPromise) {
    kjvLoadPromise = fetch(KJV_DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load KJV data.');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid KJV data.');
        kjvBooks = data as KjvBook[];
        kjvIndex = buildIndex(kjvBooks);
      });
  }
  await kjvLoadPromise;
};

const parseReference = (reference: string) => {
  const cleaned = reference.trim().replace(/[.,;]+$/, '');
  const match = cleaned.match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?$/i);
  if (!match) return null;
  const [, rawBook, chapterRaw, verseStartRaw, verseEndRaw] = match;
  const chapter = Number(chapterRaw);
  const verseStart = verseStartRaw ? Number(verseStartRaw) : null;
  const verseEnd = verseEndRaw ? Number(verseEndRaw) : verseStart;
  if (!chapter) return null;
  return { bookKey: normalizeBookKey(rawBook), chapter, verseStart, verseEnd };
};

const cleanVerse = (text: string) =>
  text
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const formatVerses = (verses: string[], startVerse: number) => {
  if (verses.length === 1) return verses[0];
  return verses
    .map((verse, idx) => `${startVerse + idx}) ${verse}`)
    .join('\n');
};

export const fetchKjvVerse = async (reference: string): Promise<ScriptureResult> => {
  try {
    await ensureKjvLoaded();
    if (!kjvBooks || !kjvIndex) {
      return { error: 'KJV data unavailable.' };
    }

    const parsed = parseReference(reference);
    if (!parsed) {
      return { error: 'Unable to parse scripture reference.' };
    }

    const bookIndex = kjvIndex[parsed.bookKey] ?? kjvIndex[parsed.bookKey.replace(/\s+/g, '')];
    if (bookIndex === undefined) {
      return { error: 'Book not found in KJV library.' };
    }

    const book = kjvBooks[bookIndex];
    const chapterIndex = parsed.chapter - 1;
    if (!book.chapters[chapterIndex]) {
      return { error: 'Chapter not found in KJV library.' };
    }

    const verses = book.chapters[chapterIndex];
    if (!parsed.verseStart) {
      const cleaned = verses.map((verse, idx) => `${idx + 1}) ${cleanVerse(verse)}`);
      return { text: cleaned.join('\n') };
    }

    const startIndex = parsed.verseStart - 1;
    const endIndex = (parsed.verseEnd ?? parsed.verseStart) - 1;
    if (startIndex < 0 || startIndex >= verses.length) {
      return { error: 'Verse not found in KJV library.' };
    }

    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.min(Math.max(startIndex, endIndex), verses.length - 1);
    const selected = verses.slice(rangeStart, rangeEnd + 1).map(cleanVerse);
    return { text: formatVerses(selected, rangeStart + 1) };
  } catch (err) {
    return { error: 'KJV service is unavailable.' };
  }
};
