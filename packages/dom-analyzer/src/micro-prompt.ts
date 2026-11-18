import { MicroPromptCommand } from '@formpilot/shared';

/**
 * In-Page Micro-Prompt Bar
 * Provides a sleek floating pill on any web page allowing real-time
 * natural language refinement of form field values.
 * Uses FormPilot AI brand navy (#11264F), vibrant cyan (#00BAC6), and clean white.
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
      background: #FFFFFF;
      color: #0F172A;
      padding: 6px 14px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(17, 38, 79, 0.15), 0 8px 10px -6px rgba(17, 38, 79, 0.1);
      border: 1px solid #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      transition: all 0.2s ease;
    `;

    root.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:#00BAC6; color:#ffffff; font-size:12px; font-weight:bold; box-shadow:0 1px 3px rgba(0,186,198,0.3);">✦</span>
        <input 
          id="fp-micro-prompt-input" 
          type="text" 
          placeholder="Ask FormPilot (e.g. 'Make answer 3 more concise')..." 
          style="background:transparent; border:none; outline:none; color:#11264F; font-size:13px; width:280px; padding:4px 0; font-weight:500;"
        />
        <button 
          id="fp-micro-prompt-submit" 
          style="background:#11264F; border:none; outline:none; color:#ffffff; border-radius:9999px; padding:5px 14px; font-size:12px; font-weight:700; cursor:pointer; transition:background 0.2s;"
        >Send</button>
        <button 
          id="fp-micro-prompt-close" 
          style="background:transparent; border:none; outline:none; color:#94A3B8; font-size:16px; cursor:pointer; padding:0 4px; line-height:1;"
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
    submitBtn.addEventListener('mouseenter', () => { submitBtn.style.background = '#0C1C3D'; });
    submitBtn.addEventListener('mouseleave', () => { submitBtn.style.background = '#11264F'; });

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
