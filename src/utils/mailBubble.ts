/**
 * Mail bubble helpers for garantie inbox: fix mojibake, strip HTML, and split
 * the "new" message from quoted reply history.
 */

const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  [/Ã¢Â€Â™/g, "'"],
  [/Ã¢Â€Â˜/g, "'"],
  [/Ã¢Â€Âœ/g, '"'],
  [/Ã¢Â€Â\u009d/g, '"'],
  [/Ã¢Â€Â"/g, "-"],
  [/Ã¢Â€Â"/g, "-"],
  [/Ã¢Â€Â¦/g, "..."],
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ã«/g, "ë"],
  [/Ã¯/g, "ï"],
  [/Ã¶/g, "ö"],
  [/Ã¼/g, "ü"],
  [/Ã¤/g, "ä"],
  [/Ã¢/g, "â"],
  [/Ã®/g, "î"],
  [/Ã´/g, "ô"],
  [/Ã§/g, "ç"],
  [/Ã±/g, "ñ"],
  [/Ã /g, "à"],
  [/Ã\u0080/g, "À"],
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, '"'],
  [/â€\u009d/g, '"'],
  [/â€"/g, "—"],
  [/â€"/g, "–"],
  [/â€¦/g, "…"],
  [/Â /g, " "],
  [/Â/g, ""],
];

export function sanitizeMailText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  // Strip HTML tags but keep breaks
  if (/<[a-z][\s\S]*>/i.test(s)) {
    s = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "");
  }
  // HTML entities
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  // Mojibake
  for (const [re, rep] of MOJIBAKE_MAP) s = s.replace(re, rep);
  // Normalize whitespace but preserve paragraphs
  s = s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

/**
 * Split the visible new message from the quoted history in a reply email.
 * Cuts at the first common reply marker.
 */
export function splitQuotedReply(text: string): { main: string; quoted: string | null } {
  if (!text) return { main: "", quoted: null };
  const lines = text.split("\n");
  const markers: RegExp[] = [
    /^-----\s*Original Message\s*-----/i,
    /^________________________________+$/,
    /^From:\s/i,
    /^Van:\s/i,
    /^Sent:\s/i,
    /^Verzonden:\s/i,
    /^To:\s/i,
    /^Aan:\s/i,
    /^Subject:\s/i,
    /^Onderwerp:\s/i,
    /^Op\s.+schreef\s.+:$/i,
    /^Op\s.+schreef\s/i,
    /^On\s.+wrote:$/i,
    /^On\s.+wrote:/i,
  ];
  let cutIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (l.startsWith(">")) {
      cutIdx = i;
      break;
    }
    if (markers.some((re) => re.test(l))) {
      cutIdx = i;
      break;
    }
  }
  if (cutIdx <= 0) return { main: text.trim(), quoted: null };
  const main = lines.slice(0, cutIdx).join("\n").trim();
  const quoted = lines.slice(cutIdx).join("\n").trim();
  return { main, quoted: quoted || null };
}