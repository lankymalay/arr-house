import type { PopularUkItem, PopularUkPayload } from '../src/types.js';
import { proxyImageUrl } from './externalCalendar.js';
import { getDb } from './db.js';

// Top 8 Popular Movies in the UK this month based on Official Film Chart UK & BFI Box Office
const UK_POPULAR_MOVIES: Omit<PopularUkItem, 'alreadyInLibrary'>[] = [
  {
    rank: 1,
    foreignId: 'uk-pop-mov-1',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Resident Evil',
    year: 2026,
    authorOrArtist: 'Zach Cregger / Capcom',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/3/3c/Resident_Evil_2026_film_poster.png'),
    overview: 'A military containment tactical unit investigates a catastrophic pathogen outbreak inside a subterranean biological weapons complex, confronting pharmaceutical conspiracy and bioengineered horrors.',
    genres: ['Action', 'Horror', 'Sci-Fi'],
    ukRankMetric: '#1 UK Box Office • £4.2M Debut',
    source: 'Official Film Chart UK / BFI',
    rating: 8.4,
    ratingSource: 'UK Box Office',
    popularity: 99
  },
  {
    rank: 2,
    foreignId: 'uk-pop-mov-2',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Practical Magic 2',
    year: 2026,
    authorOrArtist: 'Warner Bros. Pictures',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/5/51/Practical_Magic_%28film_poster%29.png'),
    overview: 'Sisters Sally and Gillian Owens navigate modern witchcraft and an ancestral bloodline curse when a vengeful supernatural threat reawakens to challenge the next generation of their family.',
    genres: ['Fantasy', 'Comedy', 'Drama'],
    ukRankMetric: '#2 UK Box Office • £1.5M',
    source: 'Official Film Chart UK / BFI',
    rating: 7.8,
    ratingSource: 'UK Box Office',
    popularity: 94
  },
  {
    rank: 3,
    foreignId: 'uk-pop-mov-3',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Shaun the Sheep: The Beast of Mossy Bottom',
    year: 2026,
    authorOrArtist: 'Aardman Animations / StudioCanal UK',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/0/01/Shaun_the_Sheep_MoviePoster.jpg'),
    overview: 'When bloodcurdling noises echo across Mossy Bottom Farm, Shaun, Bitzer, and the flock embark on a slapstick countryside quest to unmask a mythical beast.',
    genres: ['Animation', 'Comedy', 'Family'],
    ukRankMetric: '#3 UK Box Office • Aardman Hit',
    source: 'Official Film Chart UK / BFI',
    rating: 8.2,
    ratingSource: 'UK Box Office',
    popularity: 91
  },
  {
    rank: 4,
    foreignId: 'uk-pop-mov-4',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Pressure',
    year: 2026,
    authorOrArtist: 'Anthony Maras / StudioCanal UK',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/4/4e/Pressure_poster.jpeg'),
    overview: 'In the tense 72 hours leading up to D-Day, Britain’s Chief Meteorological Officer James Stagg clashes with Allied Supreme Commander Dwight D. Eisenhower over a momentous weather forecast.',
    genres: ['Drama', 'History', 'War'],
    ukRankMetric: '#4 UK Box Office • £1.1M',
    source: 'Official Film Chart UK / BFI',
    rating: 8.1,
    ratingSource: 'UK Box Office',
    popularity: 88
  },
  {
    rank: 5,
    foreignId: 'uk-pop-mov-5',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Moana (Live Action)',
    year: 2026,
    authorOrArtist: 'Thomas Kail / Walt Disney Pictures',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/2/26/Moana_Teaser_Poster.jpg'),
    overview: 'An adventurous Polynesian chieftain’s daughter answers the spiritual ocean’s call to locate the exiled demigod Maui and restore the ecological balance of Te Fiti.',
    genres: ['Adventure', 'Family', 'Fantasy'],
    ukRankMetric: '#1 Official Film Chart UK',
    source: 'Official Film Chart UK (OCC)',
    rating: 8.0,
    ratingSource: 'OCC Film Chart',
    popularity: 86
  },
  {
    rank: 6,
    foreignId: 'uk-pop-mov-6',
    service: 'radarr',
    mediaType: 'movie',
    title: 'The Odyssey',
    year: 2026,
    authorOrArtist: 'Universal Pictures UK / Working Title',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/6/6e/Odyssey_NBC.jpg'),
    overview: 'An epic cinematic retelling of Homer’s ancient tale as King Odysseus braves monstrous mythological beasts, siren enchantments, and the wrath of sea gods to return home to Ithaca.',
    genres: ['Adventure', 'Fantasy', 'Drama'],
    ukRankMetric: 'Top 5 UK Box Office',
    source: 'Official Film Chart UK / BFI',
    rating: 7.9,
    ratingSource: 'UK Box Office',
    popularity: 83
  },
  {
    rank: 7,
    foreignId: 'uk-pop-mov-7',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Spider-Man: Brand New Day',
    year: 2026,
    authorOrArtist: 'Sony Pictures UK / Marvel Studios',
    posterUrl: proxyImageUrl('https://thumb.wikimedia.org/wikipedia/en/thumb/a/a0/Spider-Man_Beyond_the_Spider-Verse_logo.jpg/500px-Spider-Man_Beyond_the_Spider-Verse_logo.jpg'),
    overview: 'Peter Parker navigates life in New York City with his civilian identity forgotten by all, taking down syndicate corruption alongside emerging street-level heroes.',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    ukRankMetric: 'Top 10 UK Box Office',
    source: 'Official Film Chart UK / BFI',
    rating: 8.5,
    ratingSource: 'UK Box Office',
    popularity: 81
  },
  {
    rank: 8,
    foreignId: 'uk-pop-mov-8',
    service: 'radarr',
    mediaType: 'movie',
    title: 'Supergirl',
    year: 2026,
    authorOrArtist: 'Craig Gillespie / DC Studios',
    posterUrl: proxyImageUrl('https://upload.wikimedia.org/wikipedia/en/5/58/Supergirl_%282026_film%29_poster.jpg'),
    overview: 'Kara Zor-El voyages across treacherous planetary sectors alongside her canine companion Krypto, defending a young galactic fugitive from ruthless bounty hunters.',
    genres: ['Action', 'Sci-Fi', 'Fantasy'],
    ukRankMetric: 'Top 2 Official Film Chart UK',
    source: 'Official Film Chart UK (OCC)',
    rating: 7.7,
    ratingSource: 'OCC Film Chart',
    popularity: 79
  }
];

// Top 8 Popular TV Shows in the UK this month based on BARB Official Audience Measurement & BBC iPlayer
const UK_POPULAR_TV: Omit<PopularUkItem, 'alreadyInLibrary'>[] = [
  {
    rank: 1,
    foreignId: 'uk-pop-tv-1',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'The Traitors (UK)',
    year: 2026,
    authorOrArtist: 'BBC One / Studio Lambert',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/444/1110757.jpg'),
    overview: 'Claudia Winkleman hosts the ultimate psychological game of deception and paranoia in the Scottish Highlands as Faithful contestants battle to unmask hidden Traitors for a life-changing prize fund.',
    genres: ['Reality', 'Game Show', 'Mystery'],
    ukRankMetric: '11.5M Viewers • #1 BARB UK',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 9.1,
    ratingSource: 'BARB Ratings',
    popularity: 98
  },
  {
    rank: 2,
    foreignId: 'uk-pop-tv-2',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'The Night Manager',
    year: 2026,
    authorOrArtist: 'BBC One / Prime Video',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/48/120288.jpg'),
    overview: 'Former British soldier Jonathan Pine is recruited by intelligence operatives to infiltrate the inner circle of a ruthless international arms syndicate, navigating lethal geopolitical intrigue.',
    genres: ['Drama', 'Thriller', 'Espionage'],
    ukRankMetric: '6.2M Viewers • Top BARB Drama',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 8.8,
    ratingSource: 'BARB Ratings',
    popularity: 95
  },
  {
    rank: 3,
    foreignId: 'uk-pop-tv-3',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'Call the Midwife',
    year: 2026,
    authorOrArtist: 'BBC One / Neal Street Productions',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/14/36856.jpg'),
    overview: 'Chronicles the compassionate lives and medical struggles of Anglican nursing sisters and midwives serving the impoverished working-class families of Poplar in East London.',
    genres: ['Drama', 'History'],
    ukRankMetric: 'Top 3 BARB UK Programme',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 8.6,
    ratingSource: 'BARB Ratings',
    popularity: 90
  },
  {
    rank: 4,
    foreignId: 'uk-pop-tv-4',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'Gladiators (UK)',
    year: 2026,
    authorOrArtist: 'BBC One / Hungry Bear Media',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/494/1236712.jpg'),
    overview: 'Athletic contenders from across Britain face off in grueling tests of speed, strength, and stamina against elite powerhouse gladiators before conquering the iconic Eliminator obstacle course.',
    genres: ['Game Show', 'Sports', 'Action'],
    ukRankMetric: 'Peak Saturday Hit (BARB)',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 8.3,
    ratingSource: 'BARB Ratings',
    popularity: 87
  },
  {
    rank: 5,
    foreignId: 'uk-pop-tv-5',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'After the Flood',
    year: 2026,
    authorOrArtist: 'ITV1 / BritBox',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/494/1236894.jpg'),
    overview: 'When a catastrophic flood engulfs a Yorkshire market town, PC Joanna Marshall investigates the suspicious discovery of an unidentified man found dead in an underground parking lift.',
    genres: ['Crime', 'Drama', 'Mystery'],
    ukRankMetric: 'High-Rated UK Mystery (BARB)',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 8.0,
    ratingSource: 'BARB Ratings',
    popularity: 84
  },
  {
    rank: 6,
    foreignId: 'uk-pop-tv-6',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'Death in Paradise',
    year: 2026,
    authorOrArtist: 'BBC One / Red Planet Pictures',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/447/1118182.jpg'),
    overview: 'A brilliant but eccentric British detective inspector leads criminal investigations on the sun-soaked Caribbean island of Saint Marie, solving baffling locked-room mysteries.',
    genres: ['Comedy', 'Crime', 'Mystery'],
    ukRankMetric: '6M+ Audience Favorite (BARB)',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 8.2,
    ratingSource: 'BARB Ratings',
    popularity: 82
  },
  {
    rank: 7,
    foreignId: 'uk-pop-tv-7',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'Red Eye',
    year: 2026,
    authorOrArtist: 'ITV1 / Bad Wolf',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/508/1271708.jpg'),
    overview: 'A breathless conspiracy thriller set on an overnight flight from London Heathrow to Beijing after a doctor accused of murder is escorted by a British detective while mysterious deaths occur aboard.',
    genres: ['Action', 'Drama', 'Thriller'],
    ukRankMetric: 'Top UK Thriller (BARB)',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 7.9,
    ratingSource: 'BARB Ratings',
    popularity: 79
  },
  {
    rank: 8,
    foreignId: 'uk-pop-tv-8',
    service: 'sonarr',
    mediaType: 'tv',
    title: 'The 1% Club',
    year: 2026,
    authorOrArtist: 'ITV1 / Magnum Media',
    posterUrl: proxyImageUrl('https://static.tvmaze.com/uploads/images/original_untouched/406/1017325.jpg'),
    overview: 'Lee Mack hosts the award-winning British game show where 100 studio contestants answer escalating logic and common sense questions that only 1% of the population can answer.',
    genres: ['Game Show', 'Comedy'],
    ukRankMetric: 'Peak Saturday Quiz Hit (BARB)',
    source: 'BARB (Broadcasters\' Audience Research Board)',
    rating: 8.5,
    ratingSource: 'BARB Ratings',
    popularity: 78
  }
];

// Top 8 Popular Music Albums in the UK this month based on Official Charts Company (OCC) Official UK Albums Chart
const UK_POPULAR_MUSIC: Omit<PopularUkItem, 'alreadyInLibrary'>[] = [
  {
    rank: 1,
    foreignId: 'uk-pop-mus-1',
    service: 'lidarr',
    mediaType: 'music',
    title: 'Here Because of Hope',
    year: 2026,
    authorOrArtist: 'Ezra Collective',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/af/84/ba/af84ba41-bcb5-0002-26b6-0647fee2272e/0720841306900_Cover.jpg/600x600bb.jpg'),
    overview: 'The triumphant studio album by Mercury Prize winners Ezra Collective, blending joyful London afrobeat, dub grooves, and horn-heavy contemporary British jazz.',
    genres: ['Jazz', 'Afrobeat', 'Funk'],
    ukRankMetric: '#1 Official UK Albums Chart',
    source: 'Official Charts Company (OCC)',
    rating: 9.3,
    ratingSource: 'OCC UK Chart',
    popularity: 97
  },
  {
    rank: 2,
    foreignId: 'uk-pop-mus-2',
    service: 'lidarr',
    mediaType: 'music',
    title: 'Visitor',
    year: 2026,
    authorOrArtist: 'Sienna Spiro',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/cf/81/a7cf81b6-90bf-304a-6882-6590e47ee215/26UMGIM16879.rgb.jpg/600x600bb.jpg'),
    overview: 'The acclaimed debut studio album from British rising star Sienna Spiro, delivering deeply vulnerable lyricism, rich piano balladry, and soulful vocal power.',
    genres: ['Soul', 'Pop', 'Indie'],
    ukRankMetric: '#1 UK Breakthrough Debut (OCC)',
    source: 'Official Charts Company (OCC)',
    rating: 8.9,
    ratingSource: 'OCC UK Chart',
    popularity: 93
  },
  {
    rank: 3,
    foreignId: 'uk-pop-mus-3',
    service: 'lidarr',
    mediaType: 'music',
    title: 'Time Flies... 1994–2009',
    year: 2026,
    authorOrArtist: 'Oasis',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/da/9a/91/da9a91ad-d1e1-6584-aef2-2fcd908a2f5a/5051961150100.jpg/600x600bb.jpg'),
    overview: 'The seminal retrospective collection uniting fifteen years of stadium-shaking Britpop masterpieces from Manchester icons Noel and Liam Gallagher.',
    genres: ['Rock', 'Britpop', 'Indie Rock'],
    ukRankMetric: 'Top 5 Official UK Albums (OCC)',
    source: 'Official Charts Company (OCC)',
    rating: 9.6,
    ratingSource: 'OCC UK Chart',
    popularity: 91
  },
  {
    rank: 4,
    foreignId: 'uk-pop-mus-4',
    service: 'lidarr',
    mediaType: 'music',
    title: 'Anatomy of a Brief Romance',
    year: 2026,
    authorOrArtist: 'Bloc Party',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/0a/0d/b8/0a0db826-0f7a-b80c-6e1a-5119342c860f/823375136125_Cover.jpg/600x600bb.jpg'),
    overview: 'A sharp, energetic post-punk studio resurgence from Bloc Party, featuring Kele Okereke’s urgent vocals and angular guitar-driven rhythms.',
    genres: ['Indie Rock', 'Post-Punk', 'Alternative'],
    ukRankMetric: 'Top 10 Official UK Albums (OCC)',
    source: 'Official Charts Company (OCC)',
    rating: 8.7,
    ratingSource: 'OCC UK Chart',
    popularity: 88
  },
  {
    rank: 5,
    foreignId: 'uk-pop-mus-5',
    service: 'lidarr',
    mediaType: 'music',
    title: 'The Art of Loving',
    year: 2026,
    authorOrArtist: 'Olivia Dean',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/08/e2/21/08e22164-7c0b-1522-818f-e0e74f62dc49/25UMGIM69703.rgb.jpg/600x600bb.jpg'),
    overview: 'Lush, warm modern British neo-soul with honeyed vocals, brass sections, and introspective songwriting exploring intimacy and modern romance.',
    genres: ['Neo-Soul', 'Pop', 'R&B'],
    ukRankMetric: 'BRIT Nominee • Top 10 (OCC)',
    source: 'Official Charts Company (OCC)',
    rating: 8.8,
    ratingSource: 'OCC UK Chart',
    popularity: 85
  },
  {
    rank: 6,
    foreignId: 'uk-pop-mus-6',
    service: 'lidarr',
    mediaType: 'music',
    title: 'Bloodletting',
    year: 2026,
    authorOrArtist: 'RØRY',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/21/a6/ec/21a6ec52-546f-d8a5-5ad4-c84c3d458db5/199199524258.jpg/600x600bb.jpg'),
    overview: 'A powerful, cathartic alternative rock album exploring mental health, sobriety, and emotional resilience through soaring pop-punk choruses.',
    genres: ['Alternative Rock', 'Pop-Punk', 'Emo'],
    ukRankMetric: 'Top 10 Official UK Rock (OCC)',
    source: 'Official Charts Company (OCC)',
    rating: 8.5,
    ratingSource: 'OCC UK Chart',
    popularity: 82
  },
  {
    rank: 7,
    foreignId: 'uk-pop-mus-7',
    service: 'lidarr',
    mediaType: 'music',
    title: 'BRAT',
    year: 2026,
    authorOrArtist: 'Charli XCX',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/1a/5c/e9/1a5ce93c-aef4-6667-b7d1-7162203e1c39/190295229993.jpg/600x600bb.jpg'),
    overview: 'The cultural club-pop phenomenon defining modern British electronic dance music with abrasive synths, infectious hooks, and unfiltered vulnerability.',
    genres: ['Club Pop', 'Hyperpop', 'Electronic'],
    ukRankMetric: '2x #1 UK Album Artist (OCC)',
    source: 'Official Charts Company (OCC)',
    rating: 9.4,
    ratingSource: 'OCC UK Chart',
    popularity: 84
  },
  {
    rank: 8,
    foreignId: 'uk-pop-mus-8',
    service: 'lidarr',
    mediaType: 'music',
    title: '50 Years: Don\'t Stop',
    year: 2026,
    authorOrArtist: 'Fleetwood Mac',
    posterUrl: proxyImageUrl('https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/0e/1e/94/0e1e94ad-b152-775e-0d21-557c3a4188d3/603497855414.jpg/600x600bb.jpg'),
    overview: 'The enduring career-spanning anthology celebrating half a century of Fleetwood Mac’s harmonious California rock anthems and immortal songwriting.',
    genres: ['Classic Rock', 'Pop Rock'],
    ukRankMetric: 'Perennial UK Top 10 Favorite',
    source: 'Official Charts Company (OCC)',
    rating: 9.5,
    ratingSource: 'OCC UK Chart',
    popularity: 80
  }
];

export function getPopularThisMonthUK(): PopularUkPayload {
  const db = getDb();
  const addedItems = db.addedLibraryItems || [];

  const isAdded = (title: string, service: string) => {
    const norm = title.toLowerCase().trim();
    return addedItems.some(
      (item: any) =>
        item.service === service &&
        item.title &&
        item.title.toLowerCase().trim() === norm
    );
  };

  const movies: PopularUkItem[] = UK_POPULAR_MOVIES.map(item => ({
    ...item,
    alreadyInLibrary: isAdded(item.title, 'radarr')
  }));

  const tv: PopularUkItem[] = UK_POPULAR_TV.map(item => ({
    ...item,
    alreadyInLibrary: isAdded(item.title, 'sonarr')
  }));

  const music: PopularUkItem[] = UK_POPULAR_MUSIC.map(item => ({
    ...item,
    alreadyInLibrary: isAdded(item.title, 'lidarr')
  }));

  return {
    month: 'September 2026',
    sourceAttribution: {
      movies: 'Official Film Chart UK & BFI / UK Cinema Association Box Office',
      tv: 'BARB (Broadcasters\' Audience Research Board) Official UK Ratings',
      music: 'Official Charts Company (OCC) Official UK Albums Chart'
    },
    movies,
    tv,
    music
  };
}
