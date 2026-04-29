export const singleClickWrapper = <Args extends any[], Return>(
  fn: (...args: Args) => Return,
  delay = 150
) => {
  let clickCount = 0;
  let timeout: number | null = null;
  const reset = () => (clickCount = 0);
  const tryExecute = (args: Args) => --clickCount > 0 || fn(...args);
  return (...args: Args) => {
    if (++clickCount > 1) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(reset, delay);
    } else timeout = setTimeout(() => tryExecute(args), delay);
  };
};

export const defer = <T>() => {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
};

export type Deferred<T = void> = ReturnType<typeof defer<T>>;

export const mouseEventToCaretIndex = <
  T extends MouseEvent & { currentTarget: Target },
  Target extends HTMLElement
>(
  { currentTarget, offsetX }: T,
  { length }: string
) => {
  const { width } = currentTarget.getBoundingClientRect();

  if (length === 0) return { caretIndex: 0, approxCharacterWidth: 0 };

  const approxCharacterWidth = width / length;
  const caretIndex = Math.round(offsetX / approxCharacterWidth);
  return {
    caretIndex: caretIndex > length ? length : caretIndex,
    approxCharacterWidth: approxCharacterWidth,
  };
};

export const isEllipsisActive = ({ scrollWidth, clientWidth }: HTMLElement) =>
  scrollWidth > clientWidth;

export const isEllipsisActiveOnEvent = <
  T extends MouseEvent & { currentTarget: Target },
  Target extends HTMLElement
>({
  currentTarget,
}: T) => isEllipsisActive(currentTarget);

export type OnlyRequire<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

let creationContainer = document.body;

export const setCreationContainer = (parent: HTMLElement) =>
  (creationContainer = parent);

export const createAtEvent = (
  { clientX, clientY }: MouseEvent,
  parent?: HTMLElement
) => {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.top = `${clientY}px`;
  element.style.left = `${clientX}px`;
  return (parent ?? creationContainer).appendChild(element);
};

export const fixToTopLeftCorner = (
  element: HTMLElement,
  attributes?: Omit<
    Partial<CSSStyleDeclaration>,
    "top" | "left" | "width" | "height"
  > &
    Partial<Record<"top" | "left" | "width" | "height", number>>
) => {
  const { top, left, width, height } = element.getBoundingClientRect();
  const fixed = document.createElement("div");
  fixed.style.position = "fixed";
  fixed.style.top = `${top + (attributes?.top ?? 0)}px`;
  fixed.style.left = `${left + (attributes?.left ?? 0)}px`;
  fixed.style.width = `${width + (attributes?.width ?? 0)}px`;
  fixed.style.height = `${height + (attributes?.height ?? 0)}px`;
  if (attributes) Object.assign(fixed.style, attributes);
  return creationContainer.appendChild(fixed);
};

export const fixToBottomLeftCorner = (
  element: HTMLElement,
  attributes?: Partial<CSSStyleDeclaration>
) => {
  const { bottom, left, width, height } = element.getBoundingClientRect();
  const fixed = document.createElement("div");
  fixed.style.position = "fixed";
  fixed.style.top = `${bottom}px`;
  fixed.style.left = `${left}px`;
  fixed.style.width = `${width}px`;
  fixed.style.height = `${height}px`;
  if (attributes) Object.assign(fixed.style, attributes);
  return creationContainer.appendChild(fixed);
};

export type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
  ? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

export const unset = <T extends Record<string, any>>(value: {
  [k in keyof T]: undefined extends T[k] ? T[k] : never;
}) => {
  for (const key in value) value[key] = undefined as any;
};

export const easeInOut = {
  id: "ease-in-out",
  t: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

export const px = (value: number) => `${value}px` as const;

export type Choose<
  T,
  Config extends {
    required?: keyof T;
    optional?: keyof T;
  }
> = (Config["required"] extends keyof T
  ? { [K in Config["required"]]: T[K] }
  : {}) &
  (Config["optional"] extends keyof T
    ? { [K in Config["optional"]]?: T[K] }
    : {});

export type Join<
  T extends readonly string[],
  Delimeter extends string
> = T extends readonly [
  infer First extends string,
  ...infer Rest extends string[]
]
  ? Rest extends []
    ? First
    : `${First}${Delimeter}${Join<Rest, Delimeter>}`
  : "";
