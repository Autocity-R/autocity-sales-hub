import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";

export const AUTOCITY_LOGO_CONTENT_ID = "autocity-logo";
export const AUTOCITY_LOGO_FILENAME = "autocity-logo-v3.png";
export const AUTOCITY_LEGACY_LOGO_URL =
  "https://www.auto-city.nl/upload/logo/logo_images_0_1698072999114488851.png";
const AUTOCITY_LOGO_BUCKET = "email-assets";
const AUTOCITY_LOGO_PATH = "autocity-logo-v3.png";
export const AUTOCITY_LOGO_PUBLIC_URL =
  "https://fnwagrmoyfyimdoaynkg.supabase.co/storage/v1/object/public/email-assets/autocity-logo-v3.png";

export interface PreparedEmailAttachment {
  filename: string;
  mimeType: string;
  data: string;
}

interface BuildGmailMimeMessageOptions {
  senderEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  attachments?: PreparedEmailAttachment[];
  inlineLogoBase64?: string;
  replyToMessageId?: string;
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: { message?: string } | null }>;
    };
  };
};

export function wrapBase64(base64: string): string {
  const clean = base64.replace(/\r?\n/g, "");
  return clean.match(/.{1,76}/g)?.join("\r\n") ?? clean;
}

export function base64UrlEncodeMimeMessage(message: string): string {
  return encodeBase64(new TextEncoder().encode(message).buffer)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function normalizeHtmlForInlineLogo(htmlBody: string): { htmlBody: string; shouldAttachLogo: boolean } {
  const containsCid = htmlBody.includes(`cid:${AUTOCITY_LOGO_CONTENT_ID}`);
  return {
    htmlBody,
    shouldAttachLogo: containsCid,
  };
}

export function forceInlineLogoVariant(htmlBody: string): string {
  return htmlBody
    .replaceAll(AUTOCITY_LEGACY_LOGO_URL, `cid:${AUTOCITY_LOGO_CONTENT_ID}`)
    .replaceAll(AUTOCITY_LEGACY_LOGO_URL.replace(/&/g, "&amp;"), `cid:${AUTOCITY_LOGO_CONTENT_ID}`)
    .replaceAll(AUTOCITY_LOGO_PUBLIC_URL, `cid:${AUTOCITY_LOGO_CONTENT_ID}`)
    .replaceAll(AUTOCITY_LOGO_PUBLIC_URL.replace(/&/g, "&amp;"), `cid:${AUTOCITY_LOGO_CONTENT_ID}`);
}

export async function loadAutocityLogoBase64(supabase: StorageClient): Promise<string> {
  const { data, error } = await supabase.storage.from(AUTOCITY_LOGO_BUCKET).download(AUTOCITY_LOGO_PATH);
  if (error || !data) {
    throw new Error(`Autocity logo could not be loaded from storage: ${error?.message || "no data"}`);
  }

  return wrapBase64(encodeBase64(await data.arrayBuffer()));
}

export function buildGmailMimeMessage(options: BuildGmailMimeMessageOptions): string {
  const attachments = options.attachments ?? [];
  const commonHeaders = buildCommonHeaders(options);
  const htmlPart = buildHtmlPart(options.htmlBody);

  if (options.inlineLogoBase64 && attachments.length > 0) {
    const mixedBoundary = makeBoundary("mixed");
    const relatedBoundary = makeBoundary("related");
    const parts = [
      ...commonHeaders,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      buildRelatedPart(relatedBoundary, htmlPart, options.inlineLogoBase64),
      ...attachments.flatMap((attachment) => [
        `--${mixedBoundary}`,
        buildAttachmentPart(attachment),
      ]),
      `--${mixedBoundary}--`,
    ];
    return parts.join("\r\n");
  }

  if (options.inlineLogoBase64) {
    const relatedBoundary = makeBoundary("related");
    return [
      ...commonHeaders,
      `Content-Type: multipart/related; boundary="${relatedBoundary}"; type="text/html"`,
      "",
      `--${relatedBoundary}`,
      htmlPart,
      `--${relatedBoundary}`,
      buildInlineLogoPart(options.inlineLogoBase64),
      `--${relatedBoundary}--`,
    ].join("\r\n");
  }

  if (attachments.length > 0) {
    const mixedBoundary = makeBoundary("mixed");
    return [
      ...commonHeaders,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      htmlPart,
      ...attachments.flatMap((attachment) => [
        `--${mixedBoundary}`,
        buildAttachmentPart(attachment),
      ]),
      `--${mixedBoundary}--`,
    ].join("\r\n");
  }

  return [
    ...commonHeaders,
    ...buildBodyHeaders(options.htmlBody),
    "",
    encodeBody(options.htmlBody),
  ].join("\r\n");
}

function buildCommonHeaders(options: BuildGmailMimeMessageOptions): string[] {
  return [
    `From: ${options.senderEmail}`,
    `To: ${options.to.join(", ")}`,
    options.cc && options.cc.length > 0 ? `Cc: ${options.cc.join(", ")}` : null,
    `Subject: ${encodeMimeHeader(options.subject)}`,
    "MIME-Version: 1.0",
    options.replyToMessageId ? `In-Reply-To: ${options.replyToMessageId}` : null,
    options.replyToMessageId ? `References: ${options.replyToMessageId}` : null,
  ].filter((header): header is string => Boolean(header));
}

function buildRelatedPart(boundary: string, htmlPart: string, inlineLogoBase64: string): string {
  return [
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    "",
    `--${boundary}`,
    htmlPart,
    `--${boundary}`,
    buildInlineLogoPart(inlineLogoBase64),
    `--${boundary}--`,
  ].join("\r\n");
}

function buildHtmlPart(htmlBody: string): string {
  return [
    ...buildBodyHeaders(htmlBody),
    "",
    encodeBody(htmlBody),
  ].join("\r\n");
}

function buildBodyHeaders(htmlBody: string): string[] {
  return [
    'Content-Type: text/html; charset="UTF-8"',
    `Content-Transfer-Encoding: ${isAscii(htmlBody) ? "7bit" : "base64"}`,
  ];
}

function encodeBody(htmlBody: string): string {
  if (isAscii(htmlBody)) {
    return normalizeLineEndings(htmlBody);
  }

  return wrapBase64(encodeBase64(new TextEncoder().encode(htmlBody).buffer));
}

function isAscii(value: string): boolean {
  return /^[\x00-\x7F]*$/.test(value);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r?\n/g, "\r\n");
}

function buildInlineLogoPart(inlineLogoBase64: string): string {
  return [
    `Content-Type: image/png; name="${AUTOCITY_LOGO_FILENAME}"`,
    "Content-Transfer-Encoding: base64",
    `Content-ID: <${AUTOCITY_LOGO_CONTENT_ID}>`,
    `Content-Disposition: inline; filename="${AUTOCITY_LOGO_FILENAME}"`,
    "",
    inlineLogoBase64,
  ].join("\r\n");
}

function buildAttachmentPart(attachment: PreparedEmailAttachment): string {
  const filename = sanitizeFilename(attachment.filename);
  return [
    `Content-Type: ${attachment.mimeType}; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${filename}"`,
    "",
    wrapBase64(attachment.data),
  ].join("\r\n");
}

function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${encodeBase64(new TextEncoder().encode(value).buffer)}?=`;
}

function makeBoundary(prefix: string): string {
  return `----=${prefix}-${crypto.randomUUID()}`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/["\r\n]/g, "_");
}