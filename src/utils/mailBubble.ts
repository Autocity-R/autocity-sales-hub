/**
 * Mail bubble helpers for garantie inbox: fix mojibake, strip HTML, and split
 * the "new" message from quoted reply history / signatures / footers.
 *
 * Belangrijk: veel inkomende bodies zijn HTML die tot één lange regel is
 * platgeslagen. De splitsing werkt daarom op tekst-index (ook midden in een
 * regel), niet alleen op regelniveau.
 */

const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  [/Ã¢Â€Â™/g, "'"],
  [/Ã¢Â€Â˜/g, "'"],
  [/Ã¢Â€Âœ/g, '"'],
  [/Ã¢Â€Â\u009d/g, '"'],
  [/Ã¢Â€Â"/g, "-"],
  [/Ã¢Â€Â¦/g, "..."],
  [/Ã¼/g, "ü"],
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ã«/g, "ë"],
  [/Ã¯/g, "ï"],
  [/Ã¶/g, "ö"],
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
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n\n")
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
    .replace(/&(apos|rsquo|lsquo);/gi, "'")
    .replace(/&(ldquo|rdquo);/gi, '"')
    .replace(/&(mdash|ndash);/gi, "—")
    .replace(/&hellip;/gi, "…")
    .replace(/&euro;/gi, "€")
    // Veelvoorkomende accent-entities (ü, é, ë, …)
    .replace(/&([aeiouyAEIOUYnNcC])(uml|acute|grave|circ|tilde|cedil|ring|slash);/g, (_m, ch, kind) => {
      const map: Record<string, Record<string, string>> = {
        uml: { a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", y: "ÿ", A: "Ä", E: "Ë", I: "Ï", O: "Ö", U: "Ü" },
        acute: { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" },
        grave: { a: "à", e: "è", i: "ì", o: "ò", u: "ù", A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù" },
        circ: { a: "â", e: "ê", i: "î", o: "ô", u: "û", A: "Â", E: "Ê", I: "Î", O: "Ô", U: "Û" },
        tilde: { a: "ã", n: "ñ", o: "õ", N: "Ñ" },
        cedil: { c: "ç", C: "Ç" },
        ring: { a: "å", A: "Å" },
        slash: { o: "ø", O: "Ø" },
      };
      return map[kind]?.[ch] ?? _m;
    })
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  // Mojibake
  for (const [re, rep] of MOJIBAKE_MAP) s = s.replace(re, rep);
  // Normalize whitespace but preserve paragraphs
  s = s
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

/** Scheidingsmarkeringen tussen "nieuw bericht" en geciteerde historie. */
const QUOTE_MARKERS: RegExp[] = [
  // -----Oorspronkelijk bericht----- / ---------- Forwarded message ----------
  /-{2,}\s*(oorspronkelijk bericht|original message|forwarded message|doorgestuurd bericht|origineel bericht)\s*-{2,}/i,
  /begin doorgestuurd bericht/i,
  /begin forwarded message/i,
  // Outlook NL/EN headers: Van: ... Verzonden:/Datum:  |  From: ... Sent:/Date:
  /\bvan:[\s\S]{0,300}?\b(verzonden|datum):/i,
  /\bfrom:[\s\S]{0,300}?\b(sent|date):/i,
  // "Op vr 31 jul 2026 om 19:24 schreef naam <mail>:"  /  "Op ... schreef ...:"
  /\bop\s[\s\S]{0,180}?\bschreef\b[\s\S]{0,200}?:/i,
  /\bon\s[\s\S]{0,180}?\bwrote:/i,
  // "Op 31 jul 2026 11:12 schreef X" (zonder afsluitende dubbele punt vlak erna)
  /\bop\s\d{1,2}\s[a-z]{3,10}\s\d{4}[\s\S]{0,40}?\bschreef\b/i,
  // Quote-prefix aan begin van een regel
  /(^|\n)\s*>+\s?/,
  // Losse Outlook-kop midden in tekst
  /(^|\n)\s*(verzonden|onderwerp|subject|aan|to|cc):\s/i,
];

/** Handtekening-/footer-openers. */
const SIGNATURE_MARKERS: RegExp[] = [
  /\bmet (?:de )?(?:vriendelijke|hartelijke) groet(?:en)?\b/i,
  /\bmet dank en vriendelijke groet(?:en)?\b/i,
  /\bmet vriendelijke groet\s*\/\s*best regards\b/i,
  /\b(kind|best|warm) regards\b/i,
  /\bmvg\b[,\s]/i,
  /\bgroet(?:en)?\s*,/i,
  /\bhartelijke groet(?:en)?\b/i,
  /\b(verzonden|sent) (?:vanaf|from) (?:mijn|my) /i,
  /\bsent from (?:my |android|iphone|ipad|outlook)/i,
];

/** Regels die duidelijk footer-ruis zijn. */
const FOOTER_NOISE =
  /(facebook|linkedin|instagram|twitter|x\.com)\s*:|https?:\/\/(?:www\.)?(facebook|linkedin|instagram)\.com|\bbeste reviews\b|\bdisclaimer\b|\bkvk[-\s]?(nr|nummer)?\b|\bbtw[-\s]?(nr|nummer)\b|\balle rechten voorbehouden\b|\bprivacyverklaring\b|\balgemene voorwaarden\b|\bunsubscribe\b|\bafmelden\b|\bdeze e-?mail\b.{0,40}\bvertrouwelijk\b/i;

function earliestMatch(text: string, patterns: RegExp[], from = 0): number {
  let best = -1;
  const hay = text.slice(from);
  for (const re of patterns) {
    const m = hay.match(re);
    if (m && m.index !== undefined) {
      // Bij regel-gebaseerde markeringen: knip vanaf de regel zelf, niet de \n ervoor
      let idx = m.index + (m[0].startsWith("\n") ? 1 : 0);
      if (best === -1 || idx < best) best = idx;
    }
  }
  return best === -1 ? -1 : best + from;
}

/**
 * Beslis of we bij een handtekening mogen knippen. Conservatief: alleen als het
 * restant kort is of duidelijk footer-ruis bevat (namen, links, disclaimers).
 */
function signatureCutIndex(main: string): number {
  // Nooit knippen in de eerste 40 tekens — dan is de "groet" waarschijnlijk het
  // hele bericht (bijv. "Met vriendelijke groet, tot maandag dan").
  const idx = earliestMatch(main, SIGNATURE_MARKERS, 0);
  if (idx < 40) return -1;
  const rest = main.slice(idx);
  const looksLikeFooter = FOOTER_NOISE.test(rest) || rest.length <= 400;
  if (!looksLikeFooter) return -1;
  // Bevat het restant nog een echte vraag/inhoud? Dan liever laten staan.
  if (rest.length > 400 && /\?/.test(rest)) return -1;
  return idx;
}

/**
 * Splitst het zichtbare nieuwe bericht van de geciteerde historie,
 * handtekeningen en footers.
 */
export function splitQuotedReply(text: string): { main: string; quoted: string | null } {
  if (!text) return { main: "", quoted: null };
  const src = text.replace(/\r\n?/g, "\n");

  const quoteIdx = earliestMatch(src, QUOTE_MARKERS, 0);
  let main = quoteIdx > -1 ? src.slice(0, quoteIdx) : src;
  const tail: string[] = [];
  if (quoteIdx > -1) tail.push(src.slice(quoteIdx).trim());

  // Handtekening/footer uit de hoofdtekst halen
  const sigIdx = signatureCutIndex(main);
  if (sigIdx > -1) {
    tail.unshift(main.slice(sigIdx).trim());
    main = main.slice(0, sigIdx);
  }

  main = main.replace(/\n{3,}/g, "\n\n").trim();
  const quoted = tail.filter(Boolean).join("\n\n").trim();

  // Vangnet: als er niets van de klant overblijft, toon dan liever de volledige
  // tekst dan een leeg bericht.
  if (!main) return { main: src.trim(), quoted: null };

  return { main, quoted: quoted || null };
}

/**
 * Knipt het LMS-handtekeningblok (logo-tabel + "Met vriendelijke groet") uit
 * ruwe HTML, vóór het strippen van tags. Nodig voor onze eigen uitgaande mails:
 * die staan als volledige HTML in de database.
 */
export function stripHtmlSignature(raw: string | null | undefined): { html: string; signature: string | null } {
  const s = String(raw || "");
  if (!/<[a-z][\s\S]*>/i.test(s)) return { html: s, signature: null };
  const markers = [
    /margin-top:24px;padding-top:16px;border-top/i,
    /border-top:1px solid #e5e7eb/i,
  ];
  for (const re of markers) {
    const m = s.match(re);
    if (m && m.index !== undefined) {
      const open = s.lastIndexOf("<div", m.index);
      const cut = open > -1 ? open : m.index;
      if (cut > 0) return { html: s.slice(0, cut), signature: s.slice(cut) };
    }
  }
  return { html: s, signature: null };
}

/**
 * Eén ingang voor een mailbubbel: handtekening-HTML eruit, opschonen en de
 * geciteerde historie afsplitsen. Werkt voor inkomende én uitgaande berichten.
 */
export function splitMailBubble(raw: string | null | undefined): { main: string; quoted: string | null } {
  const { html, signature } = stripHtmlSignature(raw);
  const { main, quoted } = splitQuotedReply(sanitizeMailText(html));
  const sigText = signature ? sanitizeMailText(signature) : "";
  const tail = [quoted, sigText].filter(Boolean).join("\n\n").trim();
  return { main, quoted: tail || null };
}
