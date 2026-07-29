import { assert, assertFalse, assertStringIncludes } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  AUTOCITY_LOGO_CONTENT_ID,
  buildGmailMimeMessage,
  normalizeHtmlForInlineLogo,
} from "../_shared/emailMime.ts";

Deno.test("builds mixed + related MIME for a signature logo and PDF attachment", () => {
  const { htmlBody, shouldAttachLogo } = normalizeHtmlForInlineLogo(
    `<p>Test</p><img src="cid:${AUTOCITY_LOGO_CONTENT_ID}" width="110" alt="Autocity">`,
  );
  const mime = buildGmailMimeMessage({
    senderEmail: "werkplaats@auto-city.nl",
    to: ["hendrik@auto-city.nl"],
    subject: "MIME test",
    htmlBody,
    inlineLogoBase64: shouldAttachLogo ? "iVBORw0KGgo=" : undefined,
    attachments: [{ filename: "factuur.pdf", mimeType: "application/pdf", data: "JVBERi0xLjQ=" }],
  });

  assert(shouldAttachLogo);
  assertStringIncludes(mime, "Content-Type: multipart/mixed;");
  assertStringIncludes(mime, "Content-Type: multipart/related;");
  assertStringIncludes(mime, "Content-ID: <autocity-logo>");
  assertStringIncludes(mime, "Content-Disposition: inline; filename=\"autocity-logo-v3.png\"");
  assertStringIncludes(mime, "Content-Disposition: attachment; filename=\"factuur.pdf\"");
});

Deno.test("does not add inline logo MIME when no LMS signature logo is present", () => {
  const { htmlBody, shouldAttachLogo } = normalizeHtmlForInlineLogo("<p>Geen handtekening</p>");
  const mime = buildGmailMimeMessage({
    senderEmail: "werkplaats@auto-city.nl",
    to: ["hendrik@auto-city.nl"],
    subject: "No logo test",
    htmlBody,
  });

  assertFalse(shouldAttachLogo);
  assertFalse(mime.includes("Content-ID: <autocity-logo>"));
  assertStringIncludes(mime, "Content-Type: text/html;");
});