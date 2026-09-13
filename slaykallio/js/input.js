// Canvas pages need touchend as well as pointerup. Suppress the second event
// from one gesture, while retaining native keyboard activation of buttons.
export function bindActivation(element, action) {
  let last = -Infinity;
  const activate = event => {
    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (now - last < 300 || element.disabled) return;
    last = now;
    action(event);
  };
  element.addEventListener('pointerup', activate);
  element.addEventListener('touchend', activate);
  element.addEventListener('click', event => {
    if (event.detail === 0) activate(event);
    else event.preventDefault();
  });
}
