/**
 * Familiar public names for well-known CSE directors listed by initials.
 * Keep in sync with chime/extractors/person_aliases.py
 */

type Alias = { key: string; display: string };

/** Normalized uppercase name (dots → spaces) → alias */
const BY_COMPACT: Record<string, Alias> = {
  "DHAMMIKA PERERA": { key: "dhammika_perera", display: "Dhammika Perera" },
  "K A D D PERERA": { key: "dhammika_perera", display: "Dhammika Perera" },
  "MOHAN PANDITHAGE": { key: "mohan_pandithage", display: "Mohan Pandithage" },
  "M PANDITHAGE": { key: "mohan_pandithage", display: "Mohan Pandithage" },
  "A M PANDITHAGE": { key: "mohan_pandithage", display: "Mohan Pandithage" },
  "KRISHAN BALENDRA": { key: "krishan_balendra", display: "Krishan Balendra" },
  "K BALENDRA": { key: "krishan_balendra", display: "Krishan Balendra" },
  "K N J BALENDRA": { key: "krishan_balendra", display: "Krishan Balendra" },
  "GIHAN COORAY": { key: "gihan_cooray", display: "Gihan Cooray" },
  "J G A COORAY": { key: "gihan_cooray", display: "Gihan Cooray" },
  "HARRY JAYAWARDENA": { key: "harry_jayawardena", display: "Harry Jayawardena" },
  "D S T JAYAWARDENA": { key: "harry_jayawardena", display: "Harry Jayawardena" },
  "DON S T JAYAWARDENA": { key: "harry_jayawardena", display: "Harry Jayawardena" },
  "HASITHA JAYAWARDENA": {
    key: "hasitha_jayawardena",
    display: "Hasitha Jayawardena",
  },
  "D HASITHA S JAYAWARDENA": {
    key: "hasitha_jayawardena",
    display: "Hasitha Jayawardena",
  },
  "D HASITHA STASSEN JAYAWARDENA": {
    key: "hasitha_jayawardena",
    display: "Hasitha Jayawardena",
  },
  "ISHARA NANAYAKKARA": {
    key: "ishara_nanayakkara",
    display: "Ishara Nanayakkara",
  },
  "I C NANAYAKKARA": { key: "ishara_nanayakkara", display: "Ishara Nanayakkara" },
  "KAPILA JAYAWARDENA": {
    key: "kapila_jayawardena",
    display: "Kapila Jayawardena",
  },
  "W D K JAYAWARDENA": {
    key: "kapila_jayawardena",
    display: "Kapila Jayawardena",
  },
  "SUREN MADANAYAKE": { key: "suren_madanayake", display: "Suren Madanayake" },
  "H A S MADANAYAKE": { key: "suren_madanayake", display: "Suren Madanayake" },
  "UDAYA MADANAYAKE": { key: "udaya_madanayake", display: "Udaya Madanayake" },
  "U G MADANAYAKE": { key: "udaya_madanayake", display: "Udaya Madanayake" },
  "SURESH SHAH": { key: "suresh_shah", display: "Suresh Shah" },
  "S K SHAH": { key: "suresh_shah", display: "Suresh Shah" },
  "HARSHA AMARASEKERA": {
    key: "harsha_amarasekera",
    display: "Harsha Amarasekera",
  },
  "S H AMARASEKERA": { key: "harsha_amarasekera", display: "Harsha Amarasekera" },
  "AMAL CABRAAL": { key: "amal_cabraal", display: "Amal Cabraal" },
  "D A CABRAAL": { key: "amal_cabraal", display: "Amal Cabraal" },
};

export function compactPersonName(name: string): string {
  return name
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function personAlias(name: string): Alias | null {
  const compact = compactPersonName(name);
  return BY_COMPACT[compact] ?? null;
}

export function preferredDisplayName(name: string): string {
  return personAlias(name)?.display ?? name;
}

/** Soft-merge key — aliases collapse split CSE spellings. */
export function softPersonKey(name: string): string {
  const alias = personAlias(name);
  if (alias) return `ALIAS:${alias.key.toUpperCase()}`;
  const compact = compactPersonName(name);
  const parts = compact.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return compact;
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => p[0] ?? "")
    .join("");
  return `${initials}:${last}`;
}
