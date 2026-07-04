#!/usr/bin/env node
/**
 * publish-articles.mjs
 *
 * Publishes the four Dev.to articles in ../squoosh-app/articles/ via the
 * Dev.to API. Set DEVTO_API_KEY (an "API key" from dev.to/enter) in your
 * environment before running. The key is intentionally read-only here and
 * the file is gitignored upstream.
 *
 *   Usage:
 *     DEVTO_API_KEY=<your_key> node scripts/publish-articles.mjs
 *     DEVTO_API_KEY=<your_key> node scripts/publish-articles.mjs --dry-run
 *
 *   Modes:
 *     (default)  Create new articles as drafts on Dev.to
 *     --dry-run  Print what would be sent; no API calls
 *     --publish  Create as published (omit for draft default)
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTICLES_DIR = resolve(__dirname, '../squoosh-app/articles');
const API_BASE = 'https://dev.to/api';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PUBLISH = args.includes('--publish');

const API_KEY = process.env.DEVTO_API_KEY;

if (!DRY_RUN && !API_KEY) {
  console.error(
    'ERROR: DEVTO_API_KEY is not set.\n' +
      'Generate one at https://dev.to/enter → Settings → Extensions → API Keys,\n' +
      'then re-run with `DEVTO_API_KEY=<key> node scripts/publish-articles.mjs`.'
  );
  process.exit(1);
}

/**
 * Parse the YAML-style frontmatter at the top of a markdown file.
 * Returns { data: {...}, body: '...' } similar to gray-matter.
 */
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Could not find frontmatter block in article.');
  }
  const [, rawData, body] = match;

  // Minimal YAML-ish parser sufficient for the frontmatter shape we use.
  // Supports: title (string), published (bool), tags (YAML list or JS array
  // literal), canonical_url, cover_image, series (null|string).
  const data = {};
  const lines = rawData.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!kv) {
      i += 1;
      continue;
    }
    const [, key, rawValue] = kv;
    const trimmed = rawValue.trim();
    if (trimmed === '') {
      // Could be a list or an object — read until indent drops.
      const collected = [];
      i += 1;
      while (i < lines.length) {
        const inner = lines[i];
        if (inner.startsWith(' ') || inner.startsWith('\t')) {
          collected.push(inner.trim());
          i += 1;
        } else {
          break;
        }
      }
      // Detect JS-array-style lists like [ 'webdev', 'perf' ]
      const joined = collected.join(' ');
      const arrayMatch = joined.match(/^\[(.*)\]$/);
      if (arrayMatch) {
        const inner = arrayMatch[1];
        data[key] = inner
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        // Plain list items like `- foo`
        data[key] = collected
          .map((s) => s.replace(/^-\s*/, '').replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
      continue;
    }
    if (trimmed === 'null') {
      data[key] = null;
    } else if (trimmed === 'true') {
      data[key] = true;
    } else if (trimmed === 'false') {
      data[key] = false;
    } else {
      // Strip wrapping quotes
      data[key] = trimmed.replace(/^['"]|['"]$/g, '');
    }
    i += 1;
  }
  return { data, body };
}

async function loadArticle(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  return { filePath, ...data, body };
}

function buildPayload(article) {
  return {
    article: {
      title: article.title,
      body_markdown: article.body.trim() + '\n',
      published: PUBLISH || (article.published === true),
      tags: Array.isArray(article.tags)
        ? article.tags.filter((t) => t && typeof t === 'string')
        : [],
      canonical_url: article.canonical_url || undefined,
      cover_image: article.cover_image || undefined,
      series: article.series || undefined,
      description:
        article.body
          .replace(/[#*_>`\-]/g, '')
          .split(/\n\n/)[0]
          ?.slice(0, 140)
          ?.trim() ||
        article.title,
    },
  };
}

async function publishOne(article) {
  const payload = buildPayload(article);
  const fileLabel = article.filePath.split(/[\\/]/).pop();

  if (DRY_RUN) {
    console.log(`\n[dry-run] ${fileLabel}`);
    console.log('  title        :', payload.article.title);
    console.log('  published    :', payload.article.published);
    console.log('  tags         :', payload.article.tags.join(', '));
    console.log('  canonical_url:', payload.article.canonical_url || '(none)');
    console.log('  cover_image  :', payload.article.cover_image || '(none)');
    console.log('  body length  :', payload.article.body_markdown.length, 'chars');
    return { dryRun: true, file: fileLabel };
  }

  const url = `${API_BASE}/articles`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    console.error(`\n[FAIL] ${fileLabel} → ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(json, null, 2));
    return { ok: false, file: fileLabel, status: response.status, body: json };
  }

  console.log(`\n[OK]   ${fileLabel} → https://dev.to${json.url || ''}`);
  return { ok: true, file: fileLabel, url: json.url, id: json.id };
}

async function main() {
  const entries = await readdir(ARTICLES_DIR);
  const mdFiles = entries
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => join(ARTICLES_DIR, name));

  if (mdFiles.length === 0) {
    console.error(`No .md files found in ${ARTICLES_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${mdFiles.length} article(s) in ${ARTICLES_DIR}`);
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : PUBLISH ? 'publish' : 'draft'}`);

  const results = [];
  for (const file of mdFiles) {
    const article = await loadArticle(file);
    const result = await publishOne(article);
    results.push(result);
  }

  const summary = results.reduce(
    (acc, r) => {
      if (r.dryRun) acc.dryRun += 1;
      else if (r.ok) acc.ok += 1;
      else acc.failed += 1;
      return acc;
    },
    { ok: 0, failed: 0, dryRun: 0 }
  );

  console.log('\n--- summary ---');
  console.log(JSON.stringify(summary, null, 2));

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
