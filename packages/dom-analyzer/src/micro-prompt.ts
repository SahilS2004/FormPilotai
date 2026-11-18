import { MicroPromptCommand } from '@formpilot/shared';

/**
 * In-Page Micro-Prompt Bar
 * Provides a sleek floating pill on any web page allowing real-time
 * natural language refinement of form field values.
 */
export class InPageMicroPromptBar {
  private static containerId = 'fp-micro-prompt-bar-root';

  public static mount(onSubmit: (cmd: MicroPromptCommand) => void): void {
    if (document.getElementById(this.containerId)) return;

    const root = document.createElement('div');
    root.id = this.containerId;
    root.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      background: #1e1e24;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: all 0.2s ease;
    `;

    root.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:#3b82f6; font-size:12px;">✦</span>
        <input 
          id="fp-micro-prompt-input" 
          type="text" 
          placeholder="Ask FormPilot (e.g., 'Make answer 3 more concise')..." 
          style="background:transparent; border:none; outline:none; color:#ffffff; font-size:13px; width:280px; padding:4px 0;"
        />
        <button 
          id="fp-micro-prompt-submit" 
          style="background:#3b82f6; border:none; outline:none; color:#ffffff; border-radius:9999px; padding:4px 12px; font-size:12px; font-weight:600; cursor:pointer;"
        >Send</button>
        <button 
          id="fp-micro-prompt-close" 
          style="background:transparent; border:none; outline:none; color:#9ca3af; font-size:16px; cursor:pointer; padding:0 4px;"
        >×</button>
      </div>
    `;

    document.body.appendChild(root);

    const input = root.querySelector('#fp-micro-prompt-input') as HTMLInputElement;
    const submitBtn = root.querySelector('#fp-micro-prompt-submit') as HTMLButtonElement;
    const closeBtn = root.querySelector('#fp-micro-prompt-close') as HTMLButtonElement;

    const triggerSubmit = () => {
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      onSubmit({ promptInstruction: val });
    };

    submitBtn.addEventListener('click', triggerSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSubmit();
    });

    closeBtn.addEventListener('click', () => {
      root.remove();
    });
  }

  public static unmount(): void {
    const el = document.getElementById(this.containerId);
    if (el) el.remove();
  }
}
