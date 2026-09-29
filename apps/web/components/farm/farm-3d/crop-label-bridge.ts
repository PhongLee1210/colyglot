const labelNodes = new Map<string, HTMLElement>();

// The labels are DOM, the positions come from the render loop. Writing the
// transform straight onto the node keeps a per-frame projection off React's
// state path entirely.
export function registerCropLabel(key: string, node: HTMLElement | null): void {
  if (node) {
    labelNodes.set(key, node);
  } else {
    labelNodes.delete(key);
  }
}

export function forEachCropLabel(
  visit: (key: string, node: HTMLElement) => void
): void {
  labelNodes.forEach((node, key) => visit(key, node));
}

export function placeCropLabel(
  node: HTMLElement,
  x: number,
  y: number,
  visible: boolean
): void {
  node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
  node.style.opacity = visible ? "1" : "0";
}
