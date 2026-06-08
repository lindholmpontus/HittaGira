export type ModelSeed = {
  slug: string;
  name: string;
  query: string;
  guitarType?: 1 | 2 | 3 | 4;
};

export type ManufacturerSeed = {
  slug: string;
  name: string;
  blurb?: string;
  logoFile?: string;
  models: ModelSeed[];
};

// guitar_type: 1 = Akustiska, 2 = Elgitarrer, 3 = Halvakustiska, 4 = 12-strängade
const EL = 2 as const;
const AC = 1 as const;
const HALV = 3 as const;

export const CATALOG: ManufacturerSeed[] = [
  {
    slug: "fender",
    name: "Fender",
    blurb:
      "Sedan 1946, då Leo Fender började bygga elgitarrer i Fullerton i Kalifornien, har Fender format ljudet av modern musik — från Buddy Holly och Jimi Hendrix till samtidens scener. Stratocaster, Telecaster och Jazz Bass blev arketyper som hela världen kopierat.",
    logoFile: "Fender_(Musikinstrumente)_logo.svg",
    models: [
      { slug: "stratocaster", name: "Stratocaster", query: "Fender Stratocaster", guitarType: EL },
      { slug: "telecaster", name: "Telecaster", query: "Fender Telecaster", guitarType: EL },
      { slug: "jazzmaster", name: "Jazzmaster", query: "Fender Jazzmaster", guitarType: EL },
      { slug: "jaguar", name: "Jaguar", query: "Fender Jaguar", guitarType: EL },
      { slug: "mustang", name: "Mustang", query: "Fender Mustang", guitarType: EL },
    ],
  },
  {
    slug: "gibson",
    name: "Gibson",
    blurb:
      "Grundat i Kalamazoo, Michigan 1902 — först en mandolinmakare, sedan elgitarrens hemvist. Les Paul, SG och de halvakustiska ES-modellerna har definierat rock, blues och jazz i över ett sekel.",
    logoFile: "Gibson_Guitar_logo.svg",
    models: [
      { slug: "les-paul", name: "Les Paul", query: "Gibson Les Paul", guitarType: EL },
      { slug: "sg", name: "SG", query: "Gibson SG", guitarType: EL },
      { slug: "es-335", name: "ES-335", query: "Gibson ES-335", guitarType: HALV },
      { slug: "flying-v", name: "Flying V", query: "Gibson Flying V", guitarType: EL },
      { slug: "explorer", name: "Explorer", query: "Gibson Explorer", guitarType: EL },
      { slug: "j-45", name: "J-45", query: "Gibson J-45", guitarType: AC },
    ],
  },
  {
    slug: "squier",
    name: "Squier",
    blurb:
      "Fenders prisvärda systermärke, lanserat 1982 för att erbjuda klassiska Fender-modeller till en bredare publik. Classic Vibe-serien har på senare år fått ett rykte långt över sin prislapp.",
    logoFile: "squier.svg",
    models: [
      { slug: "stratocaster", name: "Stratocaster", query: "Squier Stratocaster", guitarType: EL },
      { slug: "telecaster", name: "Telecaster", query: "Squier Telecaster", guitarType: EL },
      { slug: "jazzmaster", name: "Jazzmaster", query: "Squier Jazzmaster", guitarType: EL },
      { slug: "jaguar", name: "Jaguar", query: "Squier Jaguar", guitarType: EL },
      { slug: "mustang", name: "Mustang", query: "Squier Mustang", guitarType: EL },
      { slug: "classic-vibe", name: "Classic Vibe", query: "Squier Classic Vibe", guitarType: EL },
    ],
  },
  {
    slug: "epiphone",
    name: "Epiphone",
    blurb:
      "Grundat 1873 i Smyrna som ett mandolinhus, idag Gibsons prisvärda systermärke. Casino blev John Lennons val, Les Paul-modellerna ger Gibson-soundet för en bråkdel av priset.",
    logoFile: "Epiphone_guitars_logo.svg.png",
    models: [
      { slug: "les-paul", name: "Les Paul", query: "Epiphone Les Paul", guitarType: EL },
      { slug: "sg", name: "SG", query: "Epiphone SG", guitarType: EL },
      { slug: "casino", name: "Casino", query: "Epiphone Casino", guitarType: HALV },
      { slug: "dot", name: "Dot", query: "Epiphone Dot", guitarType: HALV },
      { slug: "explorer", name: "Explorer", query: "Epiphone Explorer", guitarType: EL },
    ],
  },
  {
    slug: "ibanez",
    name: "Ibanez",
    blurb:
      "Japanskt sedan 1957, världskänt sedan 1980-talets shredboom. Smala halsar, snabba grepp och en oöverträffad RG-modell har gjort Ibanez till metalens och fusionens hemvist.",
    logoFile: "Ibanez_logo.svg.png",
    models: [
      { slug: "rg", name: "RG", query: "Ibanez RG", guitarType: EL },
      { slug: "s-series", name: "S-Series", query: "Ibanez S", guitarType: EL },
      { slug: "az", name: "AZ", query: "Ibanez AZ", guitarType: EL },
      { slug: "jem", name: "JEM", query: "Ibanez JEM", guitarType: EL },
      { slug: "artcore", name: "Artcore", query: "Ibanez Artcore", guitarType: HALV },
      { slug: "prestige", name: "Prestige", query: "Ibanez Prestige", guitarType: EL },
    ],
  },
  {
    slug: "prs",
    name: "PRS",
    blurb:
      "Paul Reed Smith började bygga gitarrer själv i Maryland 1985 — träförståelse på lutarnivå mötte modern elektronik. Fågelinläggningar på greppbrädan blev signaturen, Custom 24 ikonen.",
    logoFile: "Prs_guitars_logo.png",
    models: [
      { slug: "custom-24", name: "Custom 24", query: "PRS Custom 24", guitarType: EL },
      { slug: "se", name: "SE", query: "PRS SE", guitarType: EL },
      { slug: "mccarty", name: "McCarty", query: "PRS McCarty", guitarType: EL },
      { slug: "silver-sky", name: "Silver Sky", query: "PRS Silver Sky", guitarType: EL },
    ],
  },
  {
    slug: "gretsch",
    name: "Gretsch",
    blurb:
      "Grundat av tysk immigranten Friedrich Gretsch i Brooklyn 1883. Stora halvakustiska kroppar, Filter'Tron-mikrofoner och en twang som blev själva ljudet av rockabilly — och därefter Chet Atkins, George Harrison och Brian Setzer.",
    logoFile: "Gretsch_company_logo.png",
    models: [
      { slug: "white-falcon", name: "White Falcon", query: "Gretsch White Falcon", guitarType: HALV },
      { slug: "g5420", name: "G5420 / Electromatic", query: "Gretsch G5420", guitarType: HALV },
      { slug: "g6120", name: "G6120", query: "Gretsch G6120", guitarType: HALV },
      { slug: "duo-jet", name: "Duo Jet", query: "Gretsch Duo Jet", guitarType: EL },
    ],
  },
  {
    slug: "jackson",
    name: "Jackson",
    blurb:
      "Sprungen ur Charvels verkstad i San Dimas 1980, då Grover Jackson byggde Randy Rhoads första Flying V. Sedan dess synonymt med metallens vassaste former — Soloist, Dinky, Rhoads.",
    logoFile: "jackson-guitars-logo.svg",
    models: [
      { slug: "soloist", name: "Soloist", query: "Jackson Soloist", guitarType: EL },
      { slug: "dinky", name: "Dinky", query: "Jackson Dinky", guitarType: EL },
      { slug: "rhoads", name: "Rhoads", query: "Jackson Rhoads", guitarType: EL },
      { slug: "kelly", name: "Kelly", query: "Jackson Kelly", guitarType: EL },
    ],
  },
  {
    slug: "esp",
    name: "ESP / LTD",
    blurb:
      "Japanska ESP grundades 1975 i Tokyos Sannō-distrikt och blev tidigt ett av metalvärldens favoritmärken. LTD-systermärket erbjuder samma formspråk till en mer åtkomlig prislapp.",
    logoFile: "esp-guitars-logo-vector-free-download-11574124612tbevrwk2t3.png",
    models: [
      { slug: "eclipse", name: "Eclipse", query: "ESP Eclipse", guitarType: EL },
      { slug: "horizon", name: "Horizon", query: "ESP Horizon", guitarType: EL },
      { slug: "ltd-ec", name: "LTD EC", query: "LTD EC", guitarType: EL },
      { slug: "ltd-m", name: "LTD M", query: "LTD M-", guitarType: EL },
    ],
  },
  {
    slug: "yamaha",
    name: "Yamaha",
    blurb:
      "Startade som orgeltillverkare i Hamamatsu 1887 och bygger idag allt från flyglar till motorcyklar. Pacifica-serien har i decennier varit ett av branschens mest rekommenderade nybörjarval — och Revstar visar hur långt det kan gå.",
    logoFile: "yamaha-gakki.svg",
    models: [
      { slug: "pacifica", name: "Pacifica", query: "Yamaha Pacifica", guitarType: EL },
      { slug: "revstar", name: "Revstar", query: "Yamaha Revstar", guitarType: EL },
      { slug: "fg", name: "FG (Akustisk)", query: "Yamaha FG", guitarType: AC },
    ],
  },
  {
    slug: "music-man",
    name: "Music Man",
    blurb:
      "Grundat 1971 av tidigare Fender-ingenjörer, övertaget av familjen Ball 1984. StingRay-basen definierade ett ljud, JP-modellerna fångar John Petruccis precision.",
    logoFile: "music-man-logo-png-transparent.png",
    models: [
      { slug: "majesty", name: "Majesty", query: "Music Man Majesty", guitarType: EL },
      { slug: "jp", name: "JP / John Petrucci", query: "Music Man JP", guitarType: EL },
      { slug: "cutlass", name: "Cutlass", query: "Music Man Cutlass", guitarType: EL },
    ],
  },
  {
    slug: "rickenbacker",
    name: "Rickenbacker",
    blurb:
      "Tillverkare av världens första elgitarr 1932. Den jingle-jangle-klingande 12-strängade 360 blev Beatles ljud, 4003-basen definierade Chris Squire och Geddy Lee.",
    logoFile: "Rickenbacker-Logo.wine.svg",
    models: [
      { slug: "330", name: "330", query: "Rickenbacker 330", guitarType: HALV },
      { slug: "360", name: "360", query: "Rickenbacker 360", guitarType: HALV },
    ],
  },
  {
    slug: "taylor",
    name: "Taylor",
    blurb:
      "Grundat 1974 i El Cajon, Kalifornien, av Bob Taylor och Kurt Listug — då två tonåringar med en gitarrverkstad. Idag en av världens största akustiska gitarrbyggare, känd för tunna halsar och kristallklara höga frekvenser.",
    logoFile: "Taylor_Guitars_circular_logo.svg.png",
    models: [
      { slug: "gs-mini", name: "GS Mini", query: "Taylor GS Mini", guitarType: AC },
      { slug: "114", name: "114", query: "Taylor 114", guitarType: AC },
      { slug: "214", name: "214", query: "Taylor 214", guitarType: AC },
      { slug: "314", name: "314", query: "Taylor 314", guitarType: AC },
    ],
  },
  {
    slug: "martin",
    name: "Martin",
    blurb:
      "Christian Frederick Martin grundade C. F. Martin & Co i New York 1833 efter att ha emigrerat från Sachsen. Sex generationer senare bygger familjen fortfarande dreadnought-arvet i Nazareth, Pennsylvania — referensen för den amerikanska akustiska gitarren.",
    logoFile: "Martin_guitar_logo.png",
    models: [
      { slug: "d-28", name: "D-28", query: "Martin D-28", guitarType: AC },
      { slug: "d-18", name: "D-18", query: "Martin D-18", guitarType: AC },
      { slug: "00", name: "00 / 000", query: "Martin 000", guitarType: AC },
      { slug: "lx1", name: "LX1 / Little Martin", query: "Martin LX1", guitarType: AC },
    ],
  },
];
