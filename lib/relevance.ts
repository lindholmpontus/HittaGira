// Words that mark a listing as something other than the guitar itself.
// Matched as substrings so Swedish compounds count too ("gitarrstativ",
// "gitarrfodral"); the space-padded ones must stand alone (" amp ", not
// "champ"; " bass ", not "basswood").
const NOT_A_GUITAR = [
  // other instruments
  " bas ",
  " bass ",
  "elbas",
  "basgitarr",
  "saxofon",
  "saxophone",
  "trumpet",
  "trombon",
  "kornett",
  "klarinett",
  "flöjt",
  "fiol",
  "violin",
  "cello",
  "piano",
  "keyboard",
  "synth",
  "trumma",
  "trummset",
  "cymbal",
  // cases, straps and stands
  "gigbag",
  "fodral",
  "väska",
  "vaska",
  "strap",
  " rem ",
  "stativ",
  "stand",
  // parts — the heading still names the model ("Stratocaster pickups")
  "pickguard",
  "plekt",
  "kapo",
  "strängar",
  "stränguppsättning",
  "strings",
  "pickup",
  "humbucker",
  "single coil",
  "tuner",
  "stämapparat",
  "switch",
  "knappar",
  "knobs",
  "rattar",
  "fjäder",
  "fjädrar",
  "dekal",
  "decal",
  "sticker",
  "klistermärke",
  "repro",
  "replacement",
  " diy ",
  // other gear and print
  "förstärkare",
  " amp ",
  "pedal",
  "kabel",
  "mikrofon",
  "verktyg",
  "noter",
  "skola",
  "bok ",
  "böcker",
];

// Never a guitar for sale, wherever they appear in the heading.
const ALWAYS_REJECT = [
  "köpes",
  "sökes",
  "aston martin",
  "la martina",
  "carl martin",
];

// Guitar words that contain one of the words above ("stand" in "Standard").
const GUITAR_WORDS = ["standard", "dubbelhumbucker"];

// What follows one of these is what the guitar comes with ("Les Paul med
// fodral", "Strat + gigbag"), not what's for sale.
const COMES_WITH =
  /(?<![\p{L}\p{N}])(?:(?:med|with|inkl|inklusive|incl|samt)(?![\p{L}\p{N}])|m\.|[mw]\/)|\+/u;

// True when a listing heading names the queried model and is selling the
// guitar, not a part or accessory for it. Shared by all adapters.
export function passesRelevance(heading: string, query: string): boolean {
  const h = ` ${heading.toLowerCase()} `;
  if (ALWAYS_REJECT.some((k) => h.includes(k))) return false;
  // Only the heading before "med"/"+" says what's for sale, so that part must
  // name the model ("Epiphone SG + Fender Mustang förstärkare" is no Mustang).
  // Brackets in it describe the guitar ("Stratocaster (US pickups)").
  const forSale = h.split(COMES_WITH)[0];
  let words = ` ${forSale.replace(/\([^)]*\)?/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  for (const w of GUITAR_WORDS) words = words.replaceAll(w, " ");
  if (NOT_A_GUITAR.some((k) => words.includes(k))) return false;
  return matchesQuery(forSale, query);
}

// True when every word of a catalogue query (e.g. "Ibanez S", "Martin D-28")
// appears in a lowercased listing heading.
export function matchesQuery(heading: string, query: string): boolean {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((w) => /[\p{L}\p{N}]/u.test(w))
    .every((w) => wordPattern(w).test(heading));
}

function wordPattern(word: string): RegExp {
  // Sellers write model numbers loosely ("HD 28", "D28"), so a hyphen inside a
  // word matches a hyphen, a space or nothing. A trailing hyphen ("LTD M-")
  // stays literal. Words are only letters, digits and hyphens here, so
  // they're safe to use as a pattern.
  let pattern = word.replace(
    /(?<=[\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu,
    "[-\\s]?",
  );
  // Short series codes would otherwise match inside other words ("PRS SE" in
  // "case", "Ibanez AZ" in "jazz"), so they must start a word.
  if (/^\p{L}{1,2}$/u.test(word)) pattern = `(?<![\\p{L}\\p{N}])${pattern}`;
  // A lone letter must also end one: "Ibanez S" matches "S520" and "S-serie",
  // not "Super Tube Screamer" or "SR500".
  if (/^\p{L}$/u.test(word)) pattern += "(?!\\p{L})";
  return new RegExp(pattern, "u");
}
