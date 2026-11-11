import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Mounts a component in jsdom and returns its markup. Client rendering, because the
 * Radix primitives warn on every server render about layout effects.
 */
export function renderHtml(node: React.ReactNode): string {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  const root = createRoot(host);
  act(() => root.render(<TooltipProvider>{node}</TooltipProvider>));
  const html = host.innerHTML;
  act(() => root.unmount());
  return html;
}
