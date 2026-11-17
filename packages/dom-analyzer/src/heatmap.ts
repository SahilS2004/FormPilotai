import { PredictedFieldValue } from '@formpilot/shared';

/**
 * Confidence Heatmap Overlay Manager
 * Visually annotates web form elements with color-coded confidence indicators
 * and interactive source citation cards.
 */
export class ConfidenceHeatmapRenderer {
  private static readonly CONTAINER_CLASS = 'fp-confidence-badge-container';

  /**
   * Applies confidence highlighting and citation tooltips to target form fields
   */
  public static renderHeatmap(predictions: PredictedFieldValue[]): void {
    this.clearHeatmap();

    predictions.forEach((pred) => {
      let el: Element | null = null;
      if (pred.selector) {
        try {
          const matches = Array.from(document.querySelectorAll(pred.selector));
          if (matches.length === 1) el = matches[0];
        } catch {
          el = null;
        }
      }
      if (!el && pred.placeholder) {
        el = Array.from(document.querySelectorAll('input, textarea, select')).find(
          (node) => node.getAttribute('placeholder') === pred.placeholder
        ) || null;
      }
      if (!el) {
        el = document.getElementById(pred.fieldId) || document.querySelector(`[name="${pred.fieldId}"]`);
      }
      if (!el || !(el instanceof HTMLElement)) return;

      const level = pred.confidenceLevel;
      const color = level === 'high' ? '#10B981' : level === 'medium' ? '#F59E0B' : '#EF4444';
      const bgColor = level === 'high' ? 'rgba(16, 185, 129, 0.08)' : level === 'medium' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)';

      // 1. Highlight border & background
      el.style.borderColor = color;
      el.style.backgroundColor = bgColor;
      el.style.transition = 'all 0.25s ease';
      el.setAttribute('data-fp-confidence', String(pred.confidence));

      // 2. Attach floating badge
      const badge = document.createElement('div');
      badge.className = this.CONTAINER_CLASS;
      badge.style.cssText = `
        position: absolute;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border-radius: 4px;
        background: ${color};
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 600;
        z-index: 10000;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      `;

      const scorePercent = Math.round(pred.confidence * 100);
      badge.innerHTML = `<span>⚡ ${scorePercent}%</span>`;

      // Position badge right above element
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      badge.style.top = `${Math.max(0, rect.top + scrollTop - 22)}px`;
      badge.style.left = `${rect.left + scrollLeft}px`;

      // 3. Tooltip on hover
      badge.title = pred.citation 
        ? `Source: ${pred.citation.documentName}\n${pred.citation.excerpt || ''}`
        : pred.rationale || 'Grounded in Knowledge Base';

      document.body.appendChild(badge);
    });
  }

  /**
   * Cleans up all confidence overlays from the page
   */
  public static clearHeatmap(): void {
    const badges = document.querySelectorAll(`.${this.CONTAINER_CLASS}`);
    badges.forEach((b) => b.remove());
  }
}
