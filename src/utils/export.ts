import { ExportFormat, HtmlTheme, UnifiedItem } from '../types';
import { marked } from 'marked';

// ── HTML entity escaping — constructed at runtime to survive formatters ────────
function esc(text: string): string {
  const map: Record<string, string> = {};
  map['&'] = '&' + 'amp;';
  map['<'] = '&' + 'lt;';
  map['>'] = '&' + 'gt;';
  map['"'] = '&' + 'quot;';
  map["'"] = '&#039;';
  return text.replace(/[&<>"']/g, ch => map[ch] || ch);
}

// ── Word count helper ──────────────────────────────────────────────────────────
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Resolve content from a UnifiedItem ─────────────────────────────────────────
export function getPreviewContent(item: UnifiedItem): string | Record<string, string> | undefined {
  const o = item.original;
  if (item.type === 'mindseed') return undefined;
  if (item.type === 'project') return {
    'overview.md': o.files.overviewFile,
    'standards.md': o.files.standardsFile,
    'rules.md': o.files.rulesFile
  };
  if (item.type === 'signal') return `## User Prompt\n\n${o.config.messyPrompt}\n\n## Prompt Signal\n\n${o.promptSignal}\n\n## Signal Constraints\n\n${o.signalConstraints}`;
  if (item.type === 'synthesis') return o.content;
  if (item.type === 'roadmap') return o.generatedTask;
  if (o.prompt) return o.prompt;
  if (o.files) return {
    'agent.md': o.files.agentFile,
    'guidelines.md': o.files.projectGuidelines,
    'constraints.md': o.files.constraintsFile,
    'SKILL.md': o.files.skillFile
  };
  return '';
}

// ── Build a safe filename from item name ───────────────────────────────────────
export function getExportFilename(item: UnifiedItem, format: ExportFormat): string {
  const base = item.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const timestamp = new Date().toISOString().slice(0, 10);
  const extMap: Record<ExportFormat, string> = {
    markdown: '.md',
    html: '.html',
    json: '.json'
  };
  const typePrefix = item.type.replace('prompt-', 'prompt').replace('legacy-', '');
  return `${typePrefix}-${base}-${timestamp}${extMap[format]}`;
}

// ── Resolve flat markdown string from content — used by HTML + Markdown exports ─
function resolveMarkdown(content: string | Record<string, string> | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return Object.entries(content)
    .map(([name, text]) => `--- ${name} ---\n\n${text}`)
    .join('\n\n');
}

// ── Metadata block for HTML export ─────────────────────────────────────────────
function htmlMetadataBlock(title: string, md: string): string {
  const count = wordCount(md);
  const date = new Date().toISOString().slice(0, 10);
  const bq = '<' + 'blockquote';
  const bqClose = '</' + 'blockquote>';
  return `${bq} style="border-left:4px solid #3b82f6;margin:0 0 1.5rem 0;padding:0.75rem 1.25rem;background:#f8fafc;border-radius:0 0.5rem 0.5rem 0;font-size:0.9rem;">
  <strong>Title:</strong> ${esc(title)}<br>
  <strong>Word Count:</strong> ${count}<br>
  <strong>Tool:</strong> Noosphere-Architect<br>
  <strong>Generated:</strong> ${date}
${bqClose}>`;
}

// ── HTML template ──────────────────────────────────────────────────────────────
const LIGHT_CSS = [
'body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; color: #1e293b; background: #ffffff; line-height: 1.7; }',
'h1, h2, h3, h4 { color: #0f172a; font-weight: 700; line-height: 1.3; margin-top: 1.5em; margin-bottom: 0.5em; }',
'h1 { font-size: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }',
'h2 { font-size: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2em; }',
'code { background: #f1f5f9; padding: 0.15em 0.3em; border-radius: 0.25rem; font-size: 0.875em; }',
'pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }',
'pre code { background: transparent; color: inherit; padding: 0; }',
'blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.5em 1em; background: #f8fafc; border-radius: 0 0.5rem 0.5rem 0; }',
'a { color: #2563eb; }',
'table { border-collapse: collapse; width: 100%; margin: 1em 0; }',
'th, td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; text-align: left; }',
'th { background: #f8fafc; font-weight: 600; }',
'img { max-width: 100%; height: auto; }',
'hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }'
].join('\n');

const DARK_CSS = [
'body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; color: #e2e8f0; background: #0f172a; line-height: 1.7; }',
'h1, h2, h3, h4 { color: #f1f5f9; font-weight: 700; line-height: 1.3; margin-top: 1.5em; margin-bottom: 0.5em; }',
'h1 { font-size: 2rem; border-bottom: 2px solid #334155; padding-bottom: 0.3em; }',
'h2 { font-size: 1.5rem; border-bottom: 1px solid #334155; padding-bottom: 0.2em; }',
'code { background: #1e293b; padding: 0.15em 0.3em; border-radius: 0.25rem; font-size: 0.875em; color: #94a3b8; }',
'pre { background: #020617; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }',
'pre code { background: transparent; color: inherit; padding: 0; }',
'blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.5em 1em; background: #1e293b; border-radius: 0 0.5rem 0.5rem 0; }',
'a { color: #60a5fa; }',
'table { border-collapse: collapse; width: 100%; margin: 1em 0; }',
'th, td { border: 1px solid #334155; padding: 0.5em 0.75em; text-align: left; }',
'th { background: #1e293b; font-weight: 600; }',
'img { max-width: 100%; height: auto; }',
'hr { border: none; border-top: 1px solid #334155; margin: 2em 0; }'
].join('\n');

function buildHtmlDocument(markdown: string, title: string, theme: HtmlTheme): string {
  const css = theme === 'light' ? LIGHT_CSS : DARK_CSS;
  const bodyClass = theme === 'light' ? 'light' : 'dark';
  const htmlContent = marked.parse(markdown) as string;

  return '<!DOCTYPE html>\n' +
`<html lang="en" class="${bodyClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Noosphere-Architect Export</title>
  <style>
${css}
  </style>
</head>
<body class="${bodyClass}">
  <div class="export-container">
    ${htmlMetadataBlock(title, markdown)}
    <hr>
    <div class="content">
      ${htmlContent}
    </div>
  </div>
</body>
</html>`;
}

// ── Core export builder ────────────────────────────────────────────────────────
export interface ExportResult {
  blob: Blob;
  filename: string;
  format: ExportFormat;
}

export function buildExport(
  item: UnifiedItem,
  format: ExportFormat,
  htmlTheme?: HtmlTheme
): ExportResult | null {
  const content = getPreviewContent(item);
  if (!content) return null;

  const filename = getExportFilename(item, format);
  const title = item.name;

  switch (format) {
    case 'markdown': {
      const md = resolveMarkdown(content);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      return { blob, filename, format };
    }
    case 'html': {
      const md = resolveMarkdown(content);
      const html = buildHtmlDocument(md, title, htmlTheme ?? 'light');
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      return { blob, filename, format };
    }
    case 'json': {
      const json = JSON.stringify(
        {
          title,
          exportedAt: new Date().toISOString(),
          tool: 'Noosphere-Architect',
          type: item.type,
          content: typeof content === 'string' ? content : content
        },
        null,
        2
      );
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      return { blob, filename, format };
    }
  }
}

// ── Trigger browser download ───────────────────────────────────────────────────
export function triggerDownload(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sanitize a name for use as a filesystem directory/file ──────────────────────
function sanitizeFsName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '_').slice(0, 60).trim();
}

// ── Build a single item's content blob for a given format ───────────────────────
function buildItemBlob(
  item: UnifiedItem,
  format: ExportFormat,
  htmlTheme: HtmlTheme
): { content: string; filename: string } | null {
  const raw = getPreviewContent(item);
  if (!raw) return null;

  const title = item.name;
  const baseFilename = sanitizeFsName(title);
  const extMap: Record<ExportFormat, string> = { markdown: '.md', html: '.html', json: '.json' };
  const filename = `${baseFilename}${extMap[format]}`;
  const md = resolveMarkdown(raw);

  switch (format) {
    case 'markdown':
      return { content: md, filename };
    case 'html': {
      const html = buildHtmlDocument(md, title, htmlTheme);
      return { content: html, filename };
    }
    case 'json': {
      const json = JSON.stringify(
        { title, exportedAt: new Date().toISOString(), tool: 'Noosphere-Architect', type: item.type, content: raw },
        null, 2
      );
      return { content: json, filename };
    }
  }
}

// ── Build a batch zip export from multiple selected items ───────────────────────
export async function buildBatchExport(
  items: UnifiedItem[],
  format: ExportFormat,
  htmlTheme?: HtmlTheme
): Promise<ExportResult | null> {
  if (items.length === 0) return null;

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const theme = htmlTheme ?? 'light';

  for (const item of items) {
    const result = buildItemBlob(item, format, theme);
    if (!result) continue;
    const dirName = sanitizeFsName(item.name);
    zip.file(`${dirName}/${result.filename}`, result.content);
  }

  // Add a manifest file
  const manifest = items
    .filter(i => getPreviewContent(i))
    .map(i => `- ${i.name} (${i.type})`)
    .join('\n');
  zip.file('_manifest.txt', `Noosphere-Architect Batch Export\n${new Date().toISOString().slice(0, 10)}\nFormat: ${format}\n\n${manifest}`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const timestamp = new Date().toISOString().slice(0, 10);
  const extMap: Record<ExportFormat, string> = { markdown: 'md', html: 'html', json: 'json' };
  const filename = `batch-export-${timestamp}-${extMap[format]}.zip`;

  return { blob, filename, format };
}
