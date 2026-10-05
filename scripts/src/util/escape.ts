/** Escape text for XML/HTML text and attribute contexts. */
export function escapeXml(input: string): string {
  return stripControl(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export const escapeHtml = escapeXml;

function stripControl(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** Escape untrusted text for use inside a Markdown table cell or paragraph. */
export function escapeMd(input: string): string {
  const oneLine = stripControl(input).replace(/\s+/g, ' ').trim();
  const html = oneLine.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return html.replace(/([\\`*_[\]()|~!#])/g, '\\$1');
}

export function truncate(input: string, max: number): string {
  const s = input.replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Repository names GitHub allows; also safe for file names. */
export function safeRepoSlug(name: string): string | null {
  return /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== '.' && name !== '..' ? name : null;
}

/** Encode a validated https URL for use inside Markdown/HTML attributes. */
export function safeUrl(url: string): string {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error(`Refusing non-https URL: ${url}`);
  return u.href.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/"/g, '%22');
}
