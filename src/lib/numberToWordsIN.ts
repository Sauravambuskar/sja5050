const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function toWordsBelow100(n: number) {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function toWordsBelow1000(n: number) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return toWordsBelow100(rest);
  if (!rest) return `${ONES[hundreds]} hundred`;
  return `${ONES[hundreds]} hundred ${toWordsBelow100(rest)}`;
}

function capitalizeWords(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function numberToWordsIN(amount: number) {
  if (!Number.isFinite(amount)) return "";
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero";

  let rem = n;

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const rest = rem;

  const parts: string[] = [];
  if (crore) parts.push(`${toWordsBelow100(crore)} crore`);
  if (lakh) parts.push(`${toWordsBelow100(lakh)} lakh`);
  if (thousand) parts.push(`${toWordsBelow100(thousand)} thousand`);
  if (rest) parts.push(toWordsBelow1000(rest));

  return capitalizeWords(parts.join(" "));
}
