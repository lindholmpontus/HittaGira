// True when every word of a catalogue query (e.g. "Ibanez S", "Martin D-28")
// appears in a lowercased listing heading. Shared by all adapters; each one
// still applies its own negative keywords first.
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
