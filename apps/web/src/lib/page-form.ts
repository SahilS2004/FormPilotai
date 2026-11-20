import { parseHTML } from 'linkedom';
import type { FormField, FormSchema } from '@formpilot/shared';

const FIELD_TYPES = new Set(['text', 'email', 'tel', 'url', 'number', 'date', 'textarea', 'select', 'radio', 'checkbox', 'file']);

function cssEscape(value: string): string {
  return value.replace(/(^[0-9]|[^a-zA-Z0-9_-])/g, '\\$&');
}

function clean(value: string): string {
  return value.replace(/[*:\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  return text.length <= max ? text : text.slice(0, max).trim();
}

function pageTitle(document: Document, fallback: string): string {
  const heading = clean(document.querySelector('h1')?.textContent || '');
  const title = clean(document.querySelector('title')?.textContent || '');
  return clip([heading, title].filter((line, index, all) => line && all.indexOf(line) === index).join(' — '), 240) || fallback;
}

function labelFor(el: Element, document: Document): string {
  const id = el.getAttribute('id');
  if (id) {
    const explicit = document.querySelector(`label[for="${cssEscape(id)}"]`);
    const text = clean(explicit?.textContent || '');
    if (text) return text;
  }
  const parent = el.closest('label');
  const parentText = clean(parent?.textContent || '');
  if (parentText && parentText.length < 140) return parentText;
  const aria = clean(el.getAttribute('aria-label') || '');
  if (aria) return aria;
  const placeholder = clean(el.getAttribute('placeholder') || '');
  if (placeholder && !/^example@|type |your /i.test(placeholder)) return placeholder;
  const name = el.getAttribute('name') || '';
  const bare = name.replace(/\[[^\]]*\]/g, '').replace(/^q\d+_/, '').replace(/\d+$/, '');
  return clean(bare.replace(/[_-]+/g, ' '));
}

function groupQuestion(el: Element, optionLabels: Set<string>): string {
  let node: Element | null = el;
  for (let depth = 0; depth < 5 && node; depth += 1) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    for (const child of Array.from(parent.children) as Element[]) {
      if (child.contains(el)) continue;
      const text = clean(child.textContent || '');
      if (!text || text.length > 90) continue;
      if (optionLabels.has(text.toLowerCase())) continue;
      return text;
    }
    node = parent;
  }
  return '';
}

function fieldType(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  if (type === 'password' || type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image') return '';
  return FIELD_TYPES.has(type) ? type : 'text';
}

function fieldsFromDocument(document: Document): FormField[] {
  const controls = Array.from(document.querySelectorAll('input, textarea, select'));
  const drafts: FormField[] = [];
  controls.forEach((el, index) => {
    const type = fieldType(el);
    if (!type) return;
    const name = el.getAttribute('name') || '';
    if (name === 'website' || name === 'company' && el.getAttribute('type') === 'hidden') return;
    const label = labelFor(el, document);
    if (!label) return;
    const optionValue = el.getAttribute('value') || label;
    const options = type === 'select'
      ? Array.from(el.querySelectorAll('option'))
        .map((option) => ({
          label: clean(option.textContent || ''),
          value: option.getAttribute('value') || clean(option.textContent || ''),
        }))
        .filter((option) => option.value && !/^select /i.test(option.label))
      : (type === 'radio' || type === 'checkbox')
        ? [{ label, value: optionValue }]
        : undefined;
    const id = el.getAttribute('id') || `${name || 'field'}_${index}`;
    drafts.push({
      id,
      name: name || undefined,
      selector: name ? `[name="${cssEscape(name)}"]` : (el.getAttribute('id') ? `#${cssEscape(id)}` : `field_${index}`),
      label,
      type: type as FormField['type'],
      required: el.hasAttribute('required'),
      placeholder: el.getAttribute('placeholder') || undefined,
      options,
    });
  });

  const used = new Set<number>();
  const fields: FormField[] = [];
  drafts.forEach((field, index) => {
    if (used.has(index)) return;
    const groupable = (field.type === 'radio' || field.type === 'checkbox') && field.name;
    const members = groupable
      ? drafts.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => item.type === field.type && item.name === field.name)
      : [{ item: field, itemIndex: index }];
    members.forEach(({ itemIndex }) => used.add(itemIndex));
    if (members.length > 1) {
      const optionLabels = new Set(members.map(({ item }) => item.label.toLowerCase()));
      const sample = document.getElementById(members[0].item.id);
      const legend = sample ? groupQuestion(sample, optionLabels) : '';
      const question = legend || field.label;
      fields.push({
        ...field,
        label: question,
        options: members.flatMap(({ item }) => item.options || []),
      });
      return;
    }
    fields.push(field);
  });
  return fields.slice(0, 40);
}

function fieldsFromEmbeddedSchema(html: string): FormField[] {
  const source = html.replace(/\\"/g, '"');
  const fields: FormField[] = [];
  const pattern = /"id":"([^"]+)"\s*,\s*"type":"(text|email|tel|phone|url|number|date|radio|checkbox|file|textarea|select)"\s*,\s*"label":"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const id = match[1];
    const type = (match[2] === 'phone' ? 'tel' : match[2]) as FormField['type'];
    const label = clean(match[3]);
    if (!label || fields.some((field) => field.id === id)) continue;
    const ahead = source.slice(match.index, match.index + 1200);
    let options: FormField['options'];
    if (type === 'radio' || type === 'checkbox' || type === 'select') {
      const optionBlock = ahead.match(/"options":\[(.*?)\]/);
      if (optionBlock) {
        options = Array.from(optionBlock[1].matchAll(/"label":"([^"]+)"\s*,\s*"value":"([^"]+)"/g)).map((item) => ({
          label: clean(item[1]),
          value: item[2],
        }));
      }
    }
    fields.push({
      id,
      name: id,
      selector: `#${id}`,
      label,
      type,
      required: /"required":true/.test(ahead.slice(0, 400)),
      options,
    });
  }
  return fields.slice(0, 40);
}

function fieldsFromBundle(source: string): FormField[] {
  const start = source.indexOf('Inquiry Form');
  const window = start >= 0 ? source.slice(start, start + 8000) : source;
  const send = window.indexOf('Send Message');
  const slice = send > 0 ? window.slice(0, send) : window;
  const fields: FormField[] = [];
  const pattern = /children:`([^`]{2,80})`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(slice))) {
    const label = clean(match[1]);
    const after = slice.slice(match.index + match[0].length, match.index + match[0].length + 1800);
    const control = after.match(/^}\)\s*,\s*\(0,[\w$.]+\.jsxs?\)\(`(input|textarea|select)`/);
    if (!control || !label) continue;
    const tag = control[1];
    let type: FormField['type'] = 'text';
    let options: FormField['options'];
    if (tag === 'textarea') type = 'textarea';
    else if (tag === 'select') {
      type = 'select';
      options = Array.from(after.matchAll(/value:`([^`]*)`[\s\S]{0,160}?children:`([^`]*)`/g))
        .filter((item) => item[1])
        .map((item) => ({ value: item[1], label: clean(item[2]) }));
    } else {
      const typed = after.match(/type:`(text|email|tel|url|number|date)`/);
      type = (typed?.[1] || 'text') as FormField['type'];
    }
    if (fields.some((field) => field.label === label)) continue;
    const id = `bundle_${fields.length}`;
    fields.push({
      id,
      name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      selector: `#${id}`,
      label,
      type,
      required: label.includes('*') || /required:!0/.test(after.slice(0, 180)),
      options,
    });
  }
  return fields.slice(0, 40);
}

async function readText(url: string, limit: number): Promise<string> {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; FormPilotFleet/1.0)',
      accept: 'text/html,application/xhtml+xml,application/javascript,text/javascript',
    },
  });
  if (!response.ok) throw new Error(`Page returned ${response.status}`);
  const text = await response.text();
  return text.slice(0, limit);
}

function absoluteUrl(base: string, src: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/** Reads a public form page into the same schema the extension would send. */
export async function readFormPage(rawUrl: string): Promise<FormSchema> {
  const page = new URL(rawUrl);
  if (page.protocol === 'http:') page.protocol = 'https:';
  const html = await readText(page.toString(), 1_500_000);
  const { document } = parseHTML(html);
  let fields = fieldsFromDocument(document);
  const embedded = fieldsFromEmbeddedSchema(html);
  if (embedded.length > fields.length) fields = embedded;

  if (fields.length === 0) {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map((script) => script.getAttribute('src') || '')
      .filter((src) => src && !src.includes('googletagmanager') && !src.includes('gtag'))
      .slice(0, 2);
    for (const src of scripts) {
      const url = absoluteUrl(page.toString(), src);
      if (!url || new URL(url).origin !== page.origin) continue;
      try {
        const bundle = await readText(url, 1_500_000);
        const found = fieldsFromBundle(bundle);
        if (found.length > fields.length) fields = found;
      } catch (error) {
        console.warn('[fleet] script read failed', url, error);
      }
    }
  }

  return {
    id: `fleet_${Date.now()}`,
    domain: page.hostname,
    url: rawUrl,
    title: pageTitle(document, page.hostname),
    fields,
    detectedAt: new Date().toISOString(),
  };
}
