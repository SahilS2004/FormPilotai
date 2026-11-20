import { FormField, FormFieldType, FormSchema, MultiStepFormState } from '@formpilot/shared';

/**
 * Universal DOM Extractor
 * Traverses any webpage to discover form fields, resolving accessible labels,
 * custom widgets, file inputs, and multi-step indicators.
 */
export class DomFormExtractor {
  /**
   * Scans document and extracts all actionable form fields
   */
  public static extractFormSchema(documentRef: Document = document): FormSchema {
    const fields: FormField[] = [];
    const elements = documentRef.querySelectorAll<HTMLElement>(
      'input, textarea, select, [role="combobox"], [role="listbox"], [contenteditable="true"]'
    );

    const drafts: Array<{ field: FormField; element: HTMLElement }> = [];
    let counter = 0;
    elements.forEach((el) => {
      // Ignore hidden or non-interactive inputs
      if (this.isIgnoredElement(el)) return;

      const field = this.parseElementToField(el, counter++);
      if (field) drafts.push({ field, element: el });
    });
    fields.push(...this.collapseChoiceGroups(drafts));

    const stepInfo = this.detectStepInfo(documentRef);

    const heading = documentRef.querySelector('h1')?.textContent?.trim() || '';
    const blurb = documentRef.querySelector('h1')?.parentElement?.innerText?.trim() || '';
    const title = [heading, blurb, documentRef.title].filter(Boolean).join('\n').slice(0, 700) || 'Web Form';

    return {
      id: `form_${Date.now()}`,
      domain: window.location.hostname,
      url: window.location.href,
      title,
      fields,
      detectedAt: new Date().toISOString(),
      stepInfo
    };
  }

  private static isIgnoredElement(el: HTMLElement): boolean {
    if (el instanceof HTMLInputElement) {
      if (['hidden', 'submit', 'reset', 'button', 'image'].includes(el.type)) return true;
    }
    // Check if element is completely hidden from view
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      // Allow file inputs that are styled invisibly for custom upload buttons
      if (el instanceof HTMLInputElement && el.type === 'file') return false;
      return true;
    }
    return false;
  }

  private static parseElementToField(el: HTMLElement, index: number): FormField | null {
    const id = el.id || `fp_field_${index}`;
    const name = el.getAttribute('name') || undefined;
    const selector = this.generateUniqueSelector(el);
    const label = this.resolveLabel(el);
    const type = this.determineFieldType(el);
    const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
    const placeholder = el.getAttribute('placeholder') || undefined;

    let accept: string | undefined;
    if (el instanceof HTMLInputElement && el.type === 'file') {
      accept = el.getAttribute('accept') || undefined;
    }

    const options = this.extractOptions(el);
    const currentValue = this.extractCurrentValue(el);

    return {
      id,
      name,
      selector,
      label,
      placeholder,
      type,
      required,
      options,
      accept,
      currentValue
    };
  }

  private static determineFieldType(el: HTMLElement): FormFieldType {
    if (el instanceof HTMLTextAreaElement) return 'textarea';
    if (el instanceof HTMLSelectElement) return 'select';

    const role = el.getAttribute('role');
    if (role === 'combobox' || role === 'listbox') return 'custom-combobox';

    if (el instanceof HTMLInputElement) {
      const type = el.type.toLowerCase();
      switch (type) {
        case 'email': return 'email';
        case 'tel': return 'tel';
        case 'number': return 'number';
        case 'date': return 'date';
        case 'radio': return 'radio';
        case 'checkbox': return 'checkbox';
        case 'file': return 'file';
        default: return 'text';
      }
    }

    return 'text';
  }

  /**
   * Resolves the most accurate human-readable label for the field
   */
  public static resolveLabel(el: HTMLElement): string {
    // 1. Explicit <label for="id">
    if (el.id) {
      const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (explicitLabel?.textContent?.trim()) {
        return this.cleanLabel(explicitLabel.textContent);
      }
    }

    // 2. Parent <label> wrapping the input
    const parentLabel = el.closest('label');
    if (parentLabel?.textContent?.trim()) {
      return this.cleanLabel(parentLabel.textContent);
    }

    // 3. ARIA attributes
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel?.trim()) return this.cleanLabel(ariaLabel);

    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const refEl = document.getElementById(ariaLabelledBy);
      if (refEl?.textContent?.trim()) return this.cleanLabel(refEl.textContent);
    }

    // 4. Preceding sibling or nearby heading/paragraph
    const prevEl = el.previousElementSibling;
    if (prevEl && ['LABEL', 'SPAN', 'P', 'H4', 'H5', 'H6', 'STRONG', 'B'].includes(prevEl.tagName)) {
      if (prevEl.textContent?.trim()) return this.cleanLabel(prevEl.textContent);
    }

    // 5. Placeholder or name fallback
    if (el.getAttribute('placeholder')) {
      return this.cleanLabel(el.getAttribute('placeholder')!);
    }

    if (el.getAttribute('name')) {
      return this.formatFieldName(el.getAttribute('name')!);
    }

    return 'Unnamed Question';
  }

  private static cleanLabel(text: string): string {
    return text.replace(/[*:\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private static formatFieldName(name: string): string {
    return name
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  private static extractOptions(el: HTMLElement): { label: string; value: string }[] | undefined {
    if (el instanceof HTMLSelectElement) {
      return Array.from(el.options).map((opt) => ({
        label: opt.text.trim(),
        value: opt.value
      }));
    }

    if (el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'listbox') {
      const options = el.querySelectorAll('[role="option"]');
      if (options.length > 0) {
        return Array.from(options).map((opt) => ({
          label: opt.textContent?.trim() || '',
          value: opt.getAttribute('data-value') || opt.textContent?.trim() || ''
        }));
      }
    }

    return undefined;
  }

  private static extractCurrentValue(el: HTMLElement): string | boolean | string[] | undefined {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') return el.checked;
      if (el.type === 'radio') return el.checked ? el.value : '';
      return el.value;
    }
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      return el.value;
    }
    return el.textContent || undefined;
  }

  /**
   * Generates a stable CSS selector
   */
  public static generateUniqueSelector(el: HTMLElement): string {
    if (el.id) {
      const byId = `#${CSS.escape(el.id)}`;
      if (document.querySelectorAll(byId).length === 1) return byId;
    }

    const name = el.getAttribute('name');
    if (name) {
      const byName = `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
      if (document.querySelectorAll(byName).length === 1) return byName;
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      const byPlaceholder = `${el.tagName.toLowerCase()}[placeholder="${CSS.escape(placeholder)}"]`;
      if (document.querySelectorAll(byPlaceholder).length === 1) return byPlaceholder;
    }

    const parts: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current !== document.body && current !== document.documentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.tagName === current!.tagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }
      parts.unshift(part);
      if (document.querySelectorAll(parts.join(' > ')).length === 1) {
        return parts.join(' > ');
      }
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  /**
   * Detects multi-step form indicators and navigation buttons
   */
  public static detectStepInfo(doc: Document = document): MultiStepFormState | undefined {
    // Look for steppers or progress markers
    const stepIndicators = doc.querySelectorAll(
      '[class*="step"], [class*="wizard"], [class*="progress"], [role="progressbar"], [aria-label*="step"]'
    );

    let currentStep = 1;
    let totalSteps: number | undefined;

    // Look for text like "Step 2 of 4" or "Page 1 / 3"
    const textContent = doc.body.innerText || '';
    const stepMatch = textContent.match(/step\s*([0-9]+)\s*(?:of|\/)\s*([0-9]+)/i);
    if (stepMatch) {
      currentStep = parseInt(stepMatch[1], 10);
      totalSteps = parseInt(stepMatch[2], 10);
    }

    // Look for Next / Submit buttons
    const nextBtn = Array.from(doc.querySelectorAll<HTMLElement>('button, input[type="submit"], a')).find(
      (b) => {
        const text = (b.textContent || b.getAttribute('value') || '').toLowerCase();
        return text.includes('next') || text.includes('continue') || text.includes('proceed');
      }
    );

    const submitBtn = Array.from(doc.querySelectorAll<HTMLElement>('button, input[type="submit"]')).find(
      (b) => {
        const text = (b.textContent || b.getAttribute('value') || '').toLowerCase();
        return text.includes('submit') || text.includes('finish') || text.includes('complete');
      }
    );

    if (stepMatch || nextBtn || (totalSteps && totalSteps > 1)) {
      return {
        currentStep,
        totalSteps,
        isFinalStep: !nextBtn || (totalSteps ? currentStep >= totalSteps : false),
        nextButtonSelector: nextBtn ? this.generateUniqueSelector(nextBtn) : undefined,
        submitButtonSelector: submitBtn ? this.generateUniqueSelector(submitBtn) : undefined
      };
    }

    return undefined;
  }

  /**
   * Radios and checkbox sets that share a name are one question with several options.
   */
  private static collapseChoiceGroups(
    drafts: Array<{ field: FormField; element: HTMLElement }>
  ): FormField[] {
    const used = new Set<HTMLElement>();
    const fields: FormField[] = [];

    for (const draft of drafts) {
      if (used.has(draft.element)) continue;
      const { field, element } = draft;
      const groupable = (field.type === 'radio' || field.type === 'checkbox') && field.name;
      const members = groupable
        ? drafts.filter((item) => item.field.type === field.type && item.field.name === field.name)
        : [draft];

      if (members.length > 1) {
        members.forEach((item) => used.add(item.element));
        const optionLabels = members.map((item) => item.field.label).filter(Boolean);
        const question = this.resolveGroupQuestion(element, optionLabels);
        fields.push({
          ...members[0].field,
          selector: members[0].field.selector,
          label: question || members[0].field.label,
          options: members.map((item) => ({
            label: item.field.label,
            value: this.choiceValue(item.element, item.field.label),
            selector: this.choiceSelector(item.element),
          })),
        });
        continue;
      }

      used.add(element);
      fields.push(field);
    }

    return fields;
  }

  private static choiceValue(el: HTMLElement, label: string): string {
    if (el instanceof HTMLInputElement) {
      const value = el.value.trim();
      if (value && value.toLowerCase() !== 'on') return value;
    }
    return label;
  }

  private static choiceSelector(el: HTMLElement): string {
    if (el instanceof HTMLInputElement) {
      const name = el.getAttribute('name');
      const value = el.value.trim();
      if (name && value && value.toLowerCase() !== 'on') {
        const selector = `input[type="${el.type}"][name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`;
        if (document.querySelectorAll(selector).length === 1) return selector;
      }
    }
    return this.generateUniqueSelector(el);
  }

  private static resolveGroupQuestion(el: HTMLElement, optionLabels: string[]): string {
    const group = el.closest('fieldset, [role="radiogroup"], [role="group"]')
      || el.closest('[class*="fieldGroup"], [class*="field-group"], [class*="form-group"]');
    const candidates: Element[] = [];
    if (group) {
      const legend = group.querySelector('legend');
      if (legend) candidates.push(legend);
      Array.from(group.children).forEach((child) => {
        if (child.contains(el)) return;
        candidates.push(child);
      });
    }
    let node: HTMLElement | null = el.parentElement;
    for (let depth = 0; depth < 4 && node; depth += 1) {
      if (node.previousElementSibling) candidates.push(node.previousElementSibling);
      node = node.parentElement;
    }

    const optionText = new Set(optionLabels.map((label) => label.toLowerCase()));
    for (const candidate of candidates) {
      const text = this.cleanLabel(candidate.textContent || '');
      if (!text || text.length > 180) continue;
      if (optionText.has(text.toLowerCase())) continue;
      if (optionLabels.length > 1 && optionLabels.every((label) => text.includes(label))) continue;
      return text;
    }
    return '';
  }
}
