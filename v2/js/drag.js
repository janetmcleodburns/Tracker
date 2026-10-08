// One pointer-events drag-to-reorder helper for mouse, pen and touch.
// Items need data-id; the drag starts only from an element matching handleSel.
export function makeSortable(container, { itemSel, handleSel, groupAttr, onDrop }) {
  let drag = null;

  const clearMarks = () => container.querySelectorAll('.drop-before,.drop-after')
    .forEach(el => el.classList.remove('drop-before', 'drop-after'));

  container.addEventListener('pointerdown', e => {
    const handle = e.target.closest(handleSel);
    if (!handle || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const item = handle.closest(itemSel);
    if (!item) return;
    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    drag = { item, handle, group: groupAttr ? item.getAttribute(groupAttr) : null, target: null, pointerId: e.pointerId };
    item.classList.add('dragging');
  });

  container.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    clearMarks();
    drag.target = null;
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest(itemSel);
    if (under && under !== drag.item && container.contains(under)
        && (!groupAttr || under.getAttribute(groupAttr) === drag.group)) {
      const r = under.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      under.classList.add(after ? 'drop-after' : 'drop-before');
      drag.target = { id: under.dataset.id, after };
    }
    // Auto-scroll near the viewport edges.
    const edge = 60;
    if (e.clientY < edge) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 12);
  });

  const finish = e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { item, target } = drag;
    drag = null;
    item.classList.remove('dragging');
    clearMarks();
    if (target && e.type === 'pointerup') onDrop(item.dataset.id, target.id, target.after, item);
  };
  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
}
