import { mount, unmount } from "svelte";
import Popup, { type Props } from "./Popup.svelte";
import { fixToTopLeftCorner, unset } from "../utils";
import { createAtEvent } from "../utils";
export { default as ContextMenu } from "./Menu.svelte";

export type Items = Props["items"];

const current = {
  menu: undefined as Popup | undefined,
  close: undefined as (() => void) | undefined,
  target: undefined as HTMLElement | undefined,
};

export const close = () => {
  if (current.menu) unmount(current.menu);
  current.target?.remove();
  current.close?.();
  unset(current);
};

const listeners = new Set<(event: MouseEvent) => void>();

export const onContextMenu = (callback: (event: MouseEvent) => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const register = (
  element: HTMLElement,
  getters: {
    props: () => Omit<Props, "close"> | undefined;
    notAtCursor?: () => boolean;
  },
  callbacks?: {
    onMount?: () => void;
    onClose?: () => void;
  }
) =>
  element.addEventListener("contextmenu", (event) => {
    for (const listener of listeners) listener(event);
    const retrieved = getters.props();
    if (retrieved === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    close();
    const target = getters.notAtCursor?.()
      ? fixToTopLeftCorner(element)
      : createAtEvent(event);
    target.style.zIndex = "10000";
    target.style.backgroundColor = "transparent";
    current.target = target;
    const props = { ...retrieved, close };
    current.menu = mount(Popup, { target, props });
    current.close = callbacks?.onClose;
    callbacks?.onMount?.();
  });
