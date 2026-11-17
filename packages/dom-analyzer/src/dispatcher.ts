/**
 * Framework-Compatible Synthetic Event Dispatcher
 * Guarantees that React, Angular, Vue, and Svelte state bindings
 * acknowledge and persist automated form values.
 */
export class SyntheticEventDispatcher {
  /**
   * Sets value on an input element and dispatches full synthetic event cascade.
   * Supports text, textarea, select, checkbox, radio, and programmatic file attachment on <input type="file">
   */
  public static setInputValue(
    element: HTMLElement, 
    value: string | boolean | string[],
    filePayload?: {
      fileName: string;
      mimeType: string;
      fileBase64?: string;
      textContent?: string;
    }
  ): boolean {
    if (!element) return false;

    element.focus();

    if (element instanceof HTMLInputElement) {
      // 1. File Upload Inputs (<input type="file">)
      if (element.type === 'file') {
        try {
          const fileName = filePayload?.fileName || (typeof value === 'string' && value ? value : 'Alex_Morgan_Resume_2026.pdf');
          const mimeType = filePayload?.mimeType || 'application/pdf';
          let blob: Blob;

          if (filePayload?.fileBase64) {
            try {
              const cleanBase64 = filePayload.fileBase64.replace(/^data:[^;]+;base64,/, '');
              const binaryString = atob(cleanBase64);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              blob = new Blob([bytes], { type: mimeType });
            } catch (b64Err) {
              element.blur();
              return false;
            }
          } else {
            element.blur();
            return false;
          }

          const file = new File([blob], fileName, { type: mimeType });
          const dt = new DataTransfer();
          dt.items.add(file);
          element.files = dt.files;

          this.dispatchEvents(element, ['input', 'change']);
          element.blur();
          return true;
        } catch (fileErr) {
          console.warn('[SyntheticEventDispatcher] File attachment error:', fileErr);
          element.blur();
          return false;
        }
      }

      if (element.type === 'checkbox') {
        const boolVal = value === true || value === 'true' || value === 'Yes';
        if (element.checked !== boolVal) element.click();
        element.blur();
        return element.checked === boolVal;
      }

      if (element.type === 'radio') {
        const strVal = String(value);
        const matches = element.value === strVal
          || strVal === 'true'
          || element.value.toLowerCase() === strVal.toLowerCase();
        if (!matches) {
          element.blur();
          return false;
        }
        if (!element.checked) {
          const label = element.closest('label');
          if (label instanceof HTMLElement) label.click();
          else element.click();
        }
        element.blur();
        return element.checked;
      }

      // Normal text/number/email/date/tel input
      this.setNativeValue(element, String(value));
      this.dispatchEvents(element, ['keydown', 'keypress', 'input', 'keyup', 'change']);
      element.blur();
      return true;
    }

    if (element instanceof HTMLTextAreaElement) {
      this.setNativeTextareaValue(element, String(value));
      this.dispatchEvents(element, ['keydown', 'keypress', 'input', 'keyup', 'change']);
      element.blur();
      return true;
    }

    if (element instanceof HTMLSelectElement) {
      const strVal = String(value).toLowerCase();
      let matched = false;
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        if (opt.value.toLowerCase() === strVal || opt.text.toLowerCase().includes(strVal)) {
          element.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (matched) {
        this.dispatchEvents(element, ['input', 'change']);
      }
      element.blur();
      return matched;
    }

    // Custom combobox or contenteditable
    if (element.isContentEditable) {
      element.innerText = String(value);
      this.dispatchEvents(element, ['input', 'change']);
      element.blur();
      return true;
    }

    element.blur();
    return false;
  }

  /**
   * Overrides native input value setter to bypass React 16+ / Vue 3 value trackers
   */
  private static setNativeValue(element: HTMLInputElement, value: string): void {
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (prototypeValueDescriptor && prototypeValueDescriptor.set) {
      prototypeValueDescriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  private static setNativeTextareaValue(element: HTMLTextAreaElement, value: string): void {
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (prototypeValueDescriptor && prototypeValueDescriptor.set) {
      prototypeValueDescriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  private static dispatchEvents(element: HTMLElement, eventNames: string[]): void {
    for (const name of eventNames) {
      let event: Event;
      if (['click', 'mousedown', 'mouseup'].includes(name)) {
        event = new MouseEvent(name, { bubbles: true, cancelable: true, view: window });
      } else if (['keydown', 'keypress', 'keyup'].includes(name)) {
        event = new KeyboardEvent(name, { bubbles: true, cancelable: true });
      } else {
        event = new Event(name, { bubbles: true, cancelable: true });
      }
      element.dispatchEvent(event);
    }
  }
}
