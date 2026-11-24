
/* =========================================================
   HINDI TO ENGLISH TRANSLITERATION
========================================================= */

const DEV_MAP = {
  // Independent vowels
  "अ": "a",
  "आ": "aa",
  "इ": "i",
  "ई": "ee",
  "उ": "u",
  "ऊ": "oo",
  "ऋ": "ri",
  "ए": "e",
  "ऐ": "ai",
  "ओ": "o",
  "औ": "au",

  // Consonants
  "क": "k",
  "ख": "kh",
  "ग": "g",
  "घ": "gh",
  "ङ": "ng",
  "च": "ch",
  "छ": "chh",
  "ज": "j",
  "झ": "jh",
  "ञ": "ny",
  "ट": "t",
  "ठ": "th",
  "ड": "d",
  "ढ": "dh",
  "ण": "n",
  "त": "t",
  "थ": "th",
  "द": "d",
  "ध": "dh",
  "न": "n",
  "प": "p",
  "फ": "ph",
  "ब": "b",
  "भ": "bh",
  "म": "m",
  "य": "y",
  "र": "r",
  "ल": "l",
  "व": "v",
  "श": "sh",
  "ष": "sh",
  "स": "s",
  "ह": "h",

  // Nukta combinations
  "क़": "q",
  "ख़": "kh",
  "ग़": "gh",
  "ज़": "z",
  "फ़": "f",
  "ड़": "r",
  "ढ़": "rh",

  // Conjuncts
  "क्ष": "ksh",
  "त्र": "tr",
  "ज्ञ": "gy",
  "ळ": "l",
};

/* =========================================================
   MATRA MAP
========================================================= */

const MATRA_MAP = {
  "ा": "aa",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ॅ": "e",
  "ॉ": "o",
};

/* =========================================================
   CONSTANTS
========================================================= */

const INDEPENDENT_VOWELS = new Set(
  "अआइईउऊऋएऐओऔ".split("")
);

const NUKTA = "़";

/* =========================================================
   SCHWA RULE
========================================================= */

const needsSchwa = (current, next) =>
  !INDEPENDENT_VOWELS.has(current[0]) &&
  Boolean(next) &&
  !MATRA_MAP[next] &&
  next !== "्" &&
  next !== NUKTA &&
  Boolean(DEV_MAP[next]);

export const normalizePhoneticSearch = (value = "") => {
  return normalizeSearchText(value)
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/ii/g, "i")
    .replace(/oo/g, "u")
    .replace(/uu/g, "u")
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    // Remove repeated consonants: Hussain -> Husain
    .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");
};

/* =========================================================
   TRANSLITERATE HINDI
========================================================= */

export const transliterateHindi = (input = "") => {
  const text = String(input).normalize("NFC");

  let output = "";
  let i = 0;

  while (i < text.length) {
    const triple = text.slice(i, i + 3);
    const pair = text.slice(i, i + 2);
    const char = text[i];

    // Conjuncts
    if (DEV_MAP[triple]) {
      output += DEV_MAP[triple];
      i += 3;

      if (needsSchwa(triple, text[i])) {
        output += "a";
      }

      continue;
    }

    // Nukta combinations and other pairs
    if (DEV_MAP[pair]) {
      output += DEV_MAP[pair];
      i += 2;

      if (needsSchwa(pair, text[i])) {
        output += "a";
      }

      continue;
    }

    // Matras
    if (MATRA_MAP[char]) {
      output += MATRA_MAP[char];
      i++;
      continue;
    }

    // Virama and stray nukta
    if (char === "्" || char === NUKTA) {
      i++;
      continue;
    }

    // Anusvara / Chandrabindu
    if (char === "ं" || char === "ँ") {
      output += "n";
      i++;
      continue;
    }

    // Visarga
    if (char === "ः") {
      output += "h";
      i++;
      continue;
    }

    // Individual Devanagari characters
    if (DEV_MAP[char]) {
      output += DEV_MAP[char];
      i++;

      if (needsSchwa(char, text[i])) {
        output += "a";
      }

      continue;
    }

    // Latin characters, numbers and spaces
    output += char;
    i++;
  }

  return output
    .toLowerCase()
    .replace(/[.,!?।॥\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   NORMALIZE SEARCH TEXT
========================================================= */

export const normalizeSearchText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?।॥\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   GENERATE SEARCH TEXT
   Hindi + English + Simplified Variants
========================================================= */

// export const generateSearchText = (value = "") => {
//   const original = normalizeSearchText(value);

//   const latin = normalizeSearchText(
//     transliterateHindi(value)
//   );

//   const simplified = latin
//     .replace(/aa/g, "a")
//     .replace(/ee/g, "i")
//     .replace(/oo/g, "u")
//     .replace(/ph/g, "f");

//   const variants = [
//     original,
//     latin,
//     simplified,
//     simplified.replace(/v/g, "w"),
//   ];

//   return [...new Set(variants)]
//     .filter(Boolean)
//     .join(" ");
// };

export const generateSearchText = (value = "") => {
  const original = normalizeSearchText(value);

  const latin = normalizeSearchText(
    transliterateHindi(value)
  );

  const simplified = latin
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/ii/g, "i")
    .replace(/oo/g, "u")
    .replace(/uu/g, "u")
    .replace(/ph/g, "f")
    .replace(/v/g, "w");

  const phonetic = normalizePhoneticSearch(value);
  const phoneticLatin = normalizePhoneticSearch(latin);

  return [
    ...new Set([
      original,
      latin,
      simplified,
      simplified.replace(/v/g, "w"),
      phonetic,
      phoneticLatin,
    ]),
  ]
    .filter(Boolean)
    .join(" ");
};
/* =========================================================
   GENERATE SEARCH FIELDS FOR FARMER
========================================================= */

export const generateFarmerSearchFields = (farmer = {}) => ({
  nameSearch: generateSearchText(farmer.name || ""),
  villageSearch: generateSearchText(farmer.village || ""),
  districtSearch: generateSearchText(farmer.district || ""),
});
