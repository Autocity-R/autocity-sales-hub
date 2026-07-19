import React from "react";

export interface ContractV2Snapshot {
  contract_number: string;
  contract_type: "b2b" | "b2c";
  status: "concept" | "verstuurd" | "getekend" | "geannuleerd";
  branch: string;
  created_at?: string | null;
  sent_at?: string | null;
  signed_at?: string | null;
  delivery_date?: string | null;
  vehicle_snapshot: any;
  customer_snapshot: any;
  company_snapshot: any;
  sale_price_ex: number | null;
  btw_type: "marge" | "btw" | string | null;
  warranty_package?: string | null;
  warranty_package_name?: string | null;
  warranty_price?: number | null;
  trade_in_vehicle?: any;
  trade_in_value?: number | null;
  accessories?: Array<{ name: string; price: number }> | null;
  financing_conditional?: boolean | null;
  financing_party?: string | null;
  special_terms?: string | null;
  total_price: number | null;
  main_photo_url?: string | null;
  salesperson_name?: string | null;
  salesperson_email?: string | null;
  salesperson_signature_svg?: string | null;
  salesperson_signature_png?: string | null;
  buyer_signature_data_url?: string | null;
}

const LOGO_URL =
  "https://www.auto-city.nl/upload/logo/logo_images_0_1698072999114488851.png";

const fmtEur = (n: number | null | undefined) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);

const fmtDate = (d?: string | null) => {
  if (!d) return "__ / __ / ____";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const V2_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.cdv2-root {
  --accent: #FF6B00;
  --accent-glow: #FF9A00;
  --bg: #080808;
  --text: #ffffff;
  --text-2: #e0e0e0;
  --muted: #888;
  --card: rgba(255,255,255,0.025);
  --card-border: rgba(255,255,255,0.06);
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--text);
  background: #0b0b0b;
  padding: 24px 0;
  min-height: 100vh;
}
.cdv2-page {
  position: relative;
  width: 794px;
  min-height: 1123px;
  margin: 0 auto 24px;
  background: var(--bg);
  border-radius: 2px;
  overflow: hidden;
  padding: 48px 56px 40px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
}
.cdv2-page::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg,#FF6B00 0%,#FF9A00 40%,rgba(255,107,0,0.1) 100%);
}
.cdv2-page::after {
  content: "";
  position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg,transparent,rgba(255,107,0,0.3),#FF6B00);
}
.cdv2-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.cdv2-header .brand-block img { height: 46px; margin-bottom: 14px; filter: brightness(1.05); display: block; }
.cdv2-header .brand-block .title {
  font-family: 'Space Grotesk'; font-weight: 700; font-size: 36px; letter-spacing: 0.5px; color: #fff;
  line-height: 1;
}
.cdv2-header .brand-block .nr { font-size: 11px; color: #888; margin-top: 8px; font-family: 'JetBrains Mono'; }
.cdv2-header .brand-block .delivery {
  display: inline-block; margin-top: 6px; padding: 4px 10px; border-radius: 2px;
  background: rgba(255,107,0,0.12); color: var(--accent); font-size: 10.5px;
  border: 1px solid rgba(255,107,0,0.3); font-family: 'JetBrains Mono';
}
.cdv2-header .brand-block .badge-fin {
  display: inline-block; margin-top: 6px; margin-left: 6px; padding: 4px 10px; border-radius: 2px;
  background: rgba(255,200,0,0.12); color: #FFC800; font-size: 10.5px;
  border: 1px solid rgba(255,200,0,0.35); font-family: 'JetBrains Mono';
}
.cdv2-header .company-block {
  text-align: right; font-size: 10.5px; color: #b8b8b8; line-height: 1.55; min-width: 240px;
  border-left: 1px solid rgba(255,255,255,0.06); padding-left: 20px;
}
.cdv2-header .company-block .cname {
  font-family: 'Space Grotesk'; font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 4px;
}
.cdv2-header .company-block .cmeta { font-family: 'JetBrains Mono'; font-size: 9.5px; color: #888; margin-top: 4px; line-height: 1.6; }

.cdv2-hero {
  position: relative; margin: 28px 0 32px; height: 260px; border-radius: 2px; overflow: hidden;
  border: 1px solid var(--card-border);
}
.cdv2-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cdv2-hero .overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.55) 55%, rgba(8,8,8,0.9) 100%);
}
.cdv2-hero .left { position: absolute; left: 20px; bottom: 18px; right: 260px; }
.cdv2-hero .left h2 { font-family: 'Space Grotesk'; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.3px; }
.cdv2-hero .left .specs { font-size: 11px; color: #d0d0d0; margin-top: 6px; letter-spacing: 0.4px; }
.cdv2-hero .left .meta { font-size: 10.5px; color: #a0a0a0; margin-top: 4px; font-family: 'JetBrains Mono'; }
.cdv2-hero .right { position: absolute; right: 20px; bottom: 18px; text-align: right; }
.cdv2-hero .right .lbl { font-size: 10px; color: #999; letter-spacing: 1.4px; text-transform: uppercase; }
.cdv2-hero .right .price { font-family: 'Space Grotesk'; font-weight: 700; font-size: 28px; color: #fff; margin-top: 4px; }

.cdv2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.cdv2-section-label {
  font-size: 10px; color: var(--accent); letter-spacing: 2px; text-transform: uppercase;
  margin-bottom: 10px; font-weight: 600;
}
.cdv2-card {
  background: var(--card); border: 1px solid var(--card-border); border-radius: 2px;
  padding: 14px 16px;
}
.cdv2-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 11.5px; }
.cdv2-row:last-child { border-bottom: 0; }
.cdv2-row .k { color: #777; }
.cdv2-row .v { color: #fff; text-align: right; }
.cdv2-row .v.mono { font-family: 'JetBrains Mono'; font-size: 11px; }

.cdv2-price-block { margin: 8px 0 24px; }
.cdv2-price-row {
  display: flex; justify-content: space-between; padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px;
}
.cdv2-price-row .v { font-family: 'Space Grotesk'; font-weight: 500; color: #fff; }
.cdv2-price-row.neg .v { color: #ff8a8a; }
.cdv2-total {
  margin-top: 4px;
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 18px;
  background: linear-gradient(90deg,rgba(255,107,0,0.12),rgba(255,107,0,0.06));
  border-top: 1px solid rgba(255,107,0,0.2);
  border-bottom: 1px solid rgba(255,107,0,0.2);
}
.cdv2-total .k { font-family: 'Space Grotesk'; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #fff; }
.cdv2-total .v { font-family: 'Space Grotesk'; font-weight: 700; font-size: 22px; color: var(--accent); }
.cdv2-btw-note { font-size: 10px; color: #666; padding: 8px 4px 0; }

.cdv2-special { margin: 20px 0 24px; }
.cdv2-special .body {
  background: var(--card); border: 1px solid var(--card-border);
  padding: 12px 16px; font-size: 11.5px; color: #d0d0d0; white-space: pre-wrap; line-height: 1.55;
}

.cdv2-sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0 24px; }
.cdv2-sign-col .lbl {
  font-size: 10px; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;
}
.cdv2-sign-box {
  height: 90px; display: flex; align-items: center; justify-content: flex-start;
  padding: 4px 8px; background: #fff; border-radius: 2px;
}
.cdv2-sign-box img, .cdv2-sign-box svg { max-height: 82px; max-width: 100%; object-fit: contain; }
.cdv2-sign-line { border-bottom: 1px solid rgba(255,255,255,0.12); height: 1px; }
.cdv2-sign-meta { font-size: 10.5px; color: #888; margin-top: 8px; font-family: 'JetBrains Mono'; }

.cdv2-footer {
  border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; margin-top: 16px;
  display: flex; justify-content: space-between; font-size: 9.5px; color: #666; gap: 12px;
}
.cdv2-footer .fnote { color: #555; margin-top: 4px; font-size: 8.5px; }

/* Second page — algemene voorwaarden */
.cdv2-terms { page-break-before: always; }
.cdv2-terms h1 {
  font-family: 'Space Grotesk'; color: var(--accent); font-size: 22px; font-weight: 700;
  letter-spacing: 0.5px; margin: 0 0 20px;
}
.cdv2-terms-grid { column-count: 2; column-gap: 24px; font-size: 9.5px; color: #c4c4c4; line-height: 1.55; }
.cdv2-terms h3 {
  font-family: 'Space Grotesk'; font-size: 10.5px; color: #fff; font-weight: 600;
  margin: 8px 0 3px; text-transform: uppercase; letter-spacing: 1px;
}
.cdv2-terms p { margin: 0 0 8px; break-inside: avoid; }

@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #080808 !important; }
  body * { visibility: hidden; }
  #cdv2-document, #cdv2-document * { visibility: visible; }
  #cdv2-document { position: absolute; left: 0; top: 0; }
  .cdv2-root { padding: 0; background: #080808; }
  .cdv2-page { box-shadow: none; margin: 0 auto; }
}
`;

function computeArticlesCompanyName(company: any): string {
  return (
    company?.companyName ||
    company?.company_name ||
    company?.name ||
    "Autocity"
  );
}

function ArticleTerms({ company }: { company: any }) {
  const cname = computeArticlesCompanyName(company);
  return (
    <div className="cdv2-terms-grid">
      <h3>Artikel 1 — Toepasselijkheid</h3>
      <p>
        Deze algemene voorwaarden zijn van toepassing op alle overeenkomsten
        van koop en verkoop van gebruikte motorrijtuigen tussen {cname} en
        koper, tenzij schriftelijk uitdrukkelijk anders is overeengekomen.
      </p>
      <h3>Artikel 2 — Totstandkoming</h3>
      <p>
        De koopovereenkomst komt tot stand nadat beide partijen deze hebben
        ondertekend. Digitale ondertekening via de door verkoper verstrekte
        beveiligde link wordt gelijkgesteld aan een schriftelijke handtekening
        en heeft dezelfde juridische waarde.
      </p>
      <h3>Artikel 3 — Prijs en betaling</h3>
      <p>
        De koopsom dient uiterlijk bij aflevering volledig te zijn voldaan,
        tenzij schriftelijk anders overeengekomen. Aflevering vindt uitsluitend
        plaats na ontvangst van de volledige koopsom op de rekening van de
        verkoper. Contante betalingen zijn beperkt tot het wettelijk toegestane
        maximum.
      </p>
      <h3>Artikel 4 — Eigendomsvoorbehoud</h3>
      <p>
        Het voertuig blijft eigendom van verkoper tot het moment dat de koper
        aan al zijn (betalings)verplichtingen uit hoofde van deze overeenkomst
        heeft voldaan.
      </p>
      <h3>Artikel 5 — Annulering</h3>
      <p>
        Bij annulering door de koper na totstandkoming van deze overeenkomst
        is de koper een annuleringsvergoeding verschuldigd van 15% van de
        overeengekomen koopsom, met een minimum van € 500, onverminderd het
        recht van verkoper om volledige schadevergoeding te vorderen.
      </p>
      <h3>Artikel 6 — Financieringsvoorbehoud</h3>
      <p>
        Indien de koop is aangegaan onder voorbehoud van financiering, dient
        de koper binnen 14 dagen na ondertekening schriftelijk aan te tonen dat
        financiering is afgewezen. Bij gebreke hiervan vervalt het
        financieringsvoorbehoud en is de overeenkomst onvoorwaardelijk.
      </p>
      <h3>Artikel 7 — Inruil</h3>
      <p>
        De inruilprijs is vastgesteld op basis van de door koper verstrekte
        informatie en de staat van het inruilvoertuig zoals aangeboden.
        Verborgen gebreken, wijzigingen in staat, kilometerstand of
        ontbrekende papieren geven verkoper het recht de inruilprijs aan te
        passen of de inruil te weigeren.
      </p>
      <h3>Artikel 8 — Garantie</h3>
      <p>
        Op het verkochte voertuig is uitsluitend de op de voorzijde van deze
        overeenkomst vermelde garantieregeling van toepassing. Voor
        margevoertuigen geldt de wettelijke conformiteitsregeling. Zichtbare
        gebreken worden geacht bij aflevering te zijn aanvaard.
      </p>
      <h3>Artikel 9 — Staat van het voertuig</h3>
      <p>
        Koper verklaart het voertuig te hebben geïnspecteerd of daartoe in de
        gelegenheid te zijn gesteld en aanvaardt het voertuig in de staat
        waarin het verkeert op moment van aflevering, met inachtneming van de
        overeengekomen garantieregeling.
      </p>
      <h3>Artikel 10 — Toepasselijk recht</h3>
      <p>
        Op deze overeenkomst is uitsluitend Nederlands recht van toepassing.
        Geschillen worden voorgelegd aan de bevoegde rechter in het
        arrondissement van verkoper, tenzij dwingend recht anders voorschrijft.
      </p>
    </div>
  );
}

export const ContractDocumentV2: React.FC<{
  data: ContractV2Snapshot;
}> = ({ data }) => {
  const c = data.company_snapshot || {};
  const v = data.vehicle_snapshot || {};
  const cust = data.customer_snapshot || {};

  const salesPrice = Number(data.sale_price_ex) || 0;
  const tradeIn = Number(data.trade_in_value) || 0;
  const warrantyPrice = Number(data.warranty_price) || 0;

  const specsBits = [
    v.year,
    v.color,
    v.mileage ? `${Number(v.mileage).toLocaleString("nl-NL")} km` : null,
  ].filter(Boolean);

  const customerName =
    cust.companyName ||
    [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
    cust.name ||
    "—";

  const customerAddress =
    [cust.street || cust.address, cust.number].filter(Boolean).join(" ") || "—";
  const customerCity =
    [cust.zipCode, cust.city].filter(Boolean).join(" ") || "—";

  const companyName = c.companyName || c.company_name || c.name || "Autocity";
  const companyAddress = c.address || "";
  const companyPostalCity = [c.postalCode || c.postal_code, c.city].filter(Boolean).join(" ");
  const companyPhone = c.phone || "";
  const companyIban = c.iban || "";
  const companyBtw = c.btw || c.btw_number || "";
  const companyKvk = c.kvk || c.kvk_number || "";

  const btwNote =
    data.btw_type === "btw"
      ? "BTW-voertuig · 21% btw inbegrepen in de koopsom (voor ondernemers verrekenbaar)"
      : "Margevoertuig · margeregeling, btw niet apart verrekenbaar";

  const accessories = Array.isArray(data.accessories) ? data.accessories : [];
  const accessoriesTotal = accessories.reduce(
    (s, a) => s + (Number(a?.price) || 0),
    0,
  );
  const total =
    data.total_price ?? (salesPrice + warrantyPrice + accessoriesTotal - tradeIn);

  const tradeInV = data.trade_in_vehicle || {};
  const tradeInLine = tradeIn > 0
    ? (() => {
        const parts: string[] = [];
        const bm = [tradeInV.brand, tradeInV.model].filter(Boolean).join(" ");
        if (bm) parts.push(bm);
        if (tradeInV.year) parts.push(`(${tradeInV.year})`);
        const meta: string[] = [];
        if (tradeInV.licenseNumber) meta.push(tradeInV.licenseNumber);
        if (tradeInV.mileage) meta.push(`${Number(tradeInV.mileage).toLocaleString("nl-NL")} km`);
        const left = parts.join(" ");
        const right = meta.length ? ` · ${meta.join(" · ")}` : "";
        const desc = tradeInV.description || "";
        return left ? `Inruil: ${left}${right}` : desc ? `Inruil: ${desc}${right}` : "Inruil";
      })()
    : "";

  return (
    <div className="cdv2-root">
      <style dangerouslySetInnerHTML={{ __html: V2_CSS }} />
      <div id="cdv2-document">
        <div className="cdv2-page">
          {/* Header */}
          <div className="cdv2-header">
            <div className="brand-block">
              <img src={LOGO_URL} alt="Autocity" />
              <div className="title">KOOPCONTRACT</div>
              <div className="nr">
                Nr. {data.contract_number} · {fmtDate(data.created_at)}
              </div>
              <div>
                {data.delivery_date && (
                  <span className="delivery">
                    Afleverdatum {fmtDate(data.delivery_date)}
                  </span>
                )}
                {data.financing_conditional && (
                  <span className="badge-fin">Onder voorbehoud van financiering</span>
                )}
              </div>
            </div>
            <div className="company-block">
              <div className="cname">{companyName}</div>
              {companyAddress && <div>{companyAddress}</div>}
              {companyPostalCity && <div>{companyPostalCity}</div>}
              <div>Nederland</div>
              {companyPhone && <div>Tel: {companyPhone}</div>}
              <div className="cmeta">
                {companyIban && <div>IBAN: {companyIban}</div>}
                {companyBtw && <div>BTW: {companyBtw}</div>}
                {companyKvk && <div>KVK: {companyKvk}</div>}
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="cdv2-hero">
            {data.main_photo_url ? (
              <img src={data.main_photo_url} alt="voertuig" />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#111" }} />
            )}
            <div className="overlay" />
            <div className="left">
              <h2>
                {v.brand} {v.model}
                {v.version ? ` ${v.version}` : ""}
              </h2>
              <div className="specs">{specsBits.join(" · ")}</div>
              <div className="meta">
                Kenteken: {v.licenseNumber || "—"} · VIN: {v.vin || "—"}
              </div>
            </div>
            <div className="right">
              <div className="lbl">Vraagprijs</div>
              <div className="price">{fmtEur(salesPrice)}</div>
            </div>
          </div>

          {/* Klant + Voertuig */}
          <div className="cdv2-grid">
            <div>
              <div className="cdv2-section-label">Klantgegevens</div>
              <div className="cdv2-card">
                <div className="cdv2-row">
                  <span className="k">Naam</span>
                  <span className="v">{customerName}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Adres</span>
                  <span className="v">{customerAddress}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Woonplaats</span>
                  <span className="v">{customerCity}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Telefoon</span>
                  <span className="v">{cust.phone || "—"}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">E-mail</span>
                  <span className="v">{cust.email || "—"}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="cdv2-section-label">Voertuiggegevens</div>
              <div className="cdv2-card">
                <div className="cdv2-row">
                  <span className="k">Merk &amp; Model</span>
                  <span className="v">
                    {v.brand} {v.model}
                  </span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Kenteken</span>
                  <span className="v mono">{v.licenseNumber || "—"}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">VIN</span>
                  <span className="v mono">{v.vin || "—"}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Bouwjaar</span>
                  <span className="v">{v.year || "—"}</span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Kilometerstand</span>
                  <span className="v">
                    {v.mileage
                      ? `${Number(v.mileage).toLocaleString("nl-NL")} km`
                      : "—"}
                  </span>
                </div>
                <div className="cdv2-row">
                  <span className="k">Kleur</span>
                  <span className="v">{v.color || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prijsopbouw */}
          <div>
            <div className="cdv2-section-label">Prijsopbouw</div>
            <div className="cdv2-price-block">
              <div className="cdv2-price-row">
                <span>Voertuigprijs</span>
                <span className="v">{fmtEur(salesPrice)}</span>
              </div>
              {data.warranty_package_name && warrantyPrice > 0 && (
                <div className="cdv2-price-row">
                  <span>Garantiepakket · {data.warranty_package_name}</span>
                  <span className="v">{fmtEur(warrantyPrice)}</span>
                </div>
              )}
              {accessories.map((a, i) => (
                <div className="cdv2-price-row" key={`acc-${i}`}>
                  <span>Accessoire · {a.name || "—"}</span>
                  <span className="v">{fmtEur(Number(a.price) || 0)}</span>
                </div>
              ))}
              {tradeIn > 0 && (
                <div className="cdv2-price-row neg">
                  <span>{tradeInLine}</span>
                  <span className="v">− {fmtEur(tradeIn)}</span>
                </div>
              )}
              <div className="cdv2-total">
                <span className="k">Totaalprijs</span>
                <span className="v">{fmtEur(total)}</span>
              </div>
              <div className="cdv2-btw-note">{btwNote}</div>
              {data.financing_conditional && (
                <div className="cdv2-btw-note" style={{ color: "#FFC800", marginTop: 6 }}>
                  Deze koop is gesloten onder voorbehoud van financiering
                  {data.financing_party ? ` bij ${data.financing_party}` : ""}.
                </div>
              )}
            </div>
          </div>

          {/* Special terms */}
          {data.special_terms && (
            <div className="cdv2-special">
              <div className="cdv2-section-label">Speciale afspraken</div>
              <div className="body">{data.special_terms}</div>
            </div>
          )}

          {/* Signatures */}
          <div className="cdv2-sign-grid">
            <div className="cdv2-sign-col">
              <div className="lbl">Verkoper</div>
              <div className="cdv2-sign-box">
                {data.salesperson_signature_png ? (
                  <img src={data.salesperson_signature_png} alt="handtekening verkoper" />
                ) : data.salesperson_signature_svg ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: data.salesperson_signature_svg,
                    }}
                  />
                ) : null}
              </div>
              <div className="cdv2-sign-line" />
              <div className="cdv2-sign-meta">
                {data.salesperson_name || "—"} · Datum:{" "}
                {fmtDate(data.sent_at || data.created_at)}
              </div>
            </div>
            <div className="cdv2-sign-col">
              <div className="lbl">Koper</div>
              <div className="cdv2-sign-box">
                {data.buyer_signature_data_url ? (
                  <img src={data.buyer_signature_data_url} alt="handtekening" />
                ) : null}
              </div>
              <div className="cdv2-sign-line" />
              <div className="cdv2-sign-meta">
                {customerName} · Datum:{" "}
                {data.signed_at ? fmtDate(data.signed_at) : "__ / __ / ____"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="cdv2-footer">
            <div>
              <div>
                KVK {c.kvk || c.kvk_number || "—"} · BTW{" "}
                {c.btw || c.btw_number || "—"} · IBAN {c.iban || "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>
                {data.salesperson_name || "—"}
                {data.salesperson_email ? ` · ${data.salesperson_email}` : ""}
              </div>
              <div style={{ color: "var(--accent)", marginTop: 2 }}>
                www.auto-city.nl
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 — Algemene Voorwaarden */}
        <div className="cdv2-page cdv2-terms">
          <h1>Algemene voorwaarden</h1>
          <ArticleTerms company={c} />
          <div className="cdv2-footer" style={{ marginTop: 32 }}>
            <div>
              {companyName} · KVK {c.kvk || c.kvk_number || "—"}
            </div>
            <div>
              Contract {data.contract_number} · pagina 2/2
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDocumentV2;