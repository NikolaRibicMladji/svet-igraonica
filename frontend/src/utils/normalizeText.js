const CYR_TO_LAT_MAP = {
  А: "A",
  а: "a",
  Б: "B",
  б: "b",
  В: "V",
  в: "v",
  Г: "G",
  г: "g",
  Д: "D",
  д: "d",
  Ђ: "Đ",
  ђ: "đ",
  Е: "E",
  е: "e",
  Ж: "Ž",
  ж: "ž",
  З: "Z",
  з: "z",
  И: "I",
  и: "i",
  Ј: "J",
  ј: "j",
  К: "K",
  к: "k",
  Л: "L",
  л: "l",
  Љ: "Lj",
  љ: "lj",
  М: "M",
  м: "m",
  Н: "N",
  н: "n",
  Њ: "Nj",
  њ: "nj",
  О: "O",
  о: "o",
  П: "P",
  п: "p",
  Р: "R",
  р: "r",
  С: "S",
  с: "s",
  Т: "T",
  т: "t",
  Ћ: "Ć",
  ћ: "ć",
  У: "U",
  у: "u",
  Ф: "F",
  ф: "f",
  Х: "H",
  х: "h",
  Ц: "C",
  ц: "c",
  Ч: "Č",
  ч: "č",
  Џ: "Dž",
  џ: "dž",
  Ш: "Š",
  ш: "š",
};

const DIACRITICS_MAP = {
  č: "c",
  ć: "c",
  ž: "z",
  š: "s",
  đ: "dj",
  Č: "c",
  Ć: "c",
  Ž: "z",
  Š: "s",
  Đ: "dj",
};

const toLatin = (text = "") => {
  return String(text)
    .split("")
    .map((char) => CYR_TO_LAT_MAP[char] || char)
    .join("");
};

const removeDiacritics = (text = "") => {
  return String(text)
    .split("")
    .map((char) => DIACRITICS_MAP[char] || char)
    .join("");
};

const normalizeText = (text = "") => {
  return removeDiacritics(
    toLatin(text).trim().replace(/\s+/g, " ").toLowerCase(),
  );
};

const normalizeDisplayText = (text = "") => {
  const latin = toLatin(text).trim().replace(/\s+/g, " ");

  return latin
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export { toLatin, removeDiacritics, normalizeText, normalizeDisplayText };
