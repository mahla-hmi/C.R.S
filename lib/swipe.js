// Is a touch movement a deliberate sideways flick? Returns 'next' | 'prev' | null.
// "Next" is the page you reveal by dragging away from the reading direction: to the right in right-to-left text, to the left otherwise.
export function swipeTarget({ dx, dy, dt, rtl }) {
  if (Math.abs(dx) < 70 || Math.abs(dy) > 45 || Math.abs(dx) < Math.abs(dy) * 2 || dt > 700) return null;
  const forward = rtl ? dx > 0 : dx < 0;
  return forward ? 'next' : 'prev';
}
