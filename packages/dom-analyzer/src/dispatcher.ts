/**
 * Framework-Compatible Synthetic Event Dispatcher
 * Guarantees that React, Angular, Vue, and Svelte state bindings
 * acknowledge and persist automated form values.
 */
export class SyntheticEventDispatcher {
  /**
   * Sets value on an input element and dispatches full synthetic event cascade
   */
  public static setInputValue(element: HTMLElement, value: string | boolean | string[]): boolean {
    if (!element) return false;

    element.focus();

    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        const boolVal = Boolean(value);
        if (element.checked !== boolVal) {
          element.checked = boolVal;
          this.dispatchEvents(element, ['click', 'input', 'change']);
        }
        element.blur();
        return true;
      }

      if (element.type === 'radio') {
        const strVal = String(value);
        if (element.value === strVal || strVal === 'true') {
          element.checked = true;
          this.dispatchEvents(element, ['click', 'input', 'change']);
        }
        element.blur();
        return true;
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
