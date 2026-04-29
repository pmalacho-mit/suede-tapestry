export type WithClassify = {
  /**
   * Used to create unique class names for the components of this libary,
   * likely by prefixing or suffixing the default class names (provided as the argument `className`).
   *
   * This is useful in case something else defines a conflicting class name globally.
   * @param className
   */
  classify?: (className: string) => string;
};

export type Classify = WithClassify["classify"] | WithClassify;

type ClassNames = Record<string, string | ((...args: any[]) => string)> & {
  /** Prevent name from being define */
  name?: never;
};

type JoinWithSpace<
  T extends readonly string[],
  Acc extends string = ""
> = T extends readonly [
  infer First extends string,
  ...infer Rest extends string[]
]
  ? Rest extends []
    ? Acc extends ""
      ? First
      : `${Acc} ${First}`
    : JoinWithSpace<Rest, Acc extends "" ? First : `${Acc} ${First}`>
  : Acc;

type StringKeys<T extends ClassNames> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

interface Join<T extends ClassNames> {
  <Classes extends StringKeys<T>[]>(...classes: Classes): JoinWithSpace<{
    [K in keyof Classes]: Classes[K] extends keyof T
      ? T[Classes[K]] extends string
        ? T[Classes[K]]
        : never
      : never;
  }>;
}

const joinable = <T extends ClassNames>(classes: T) =>
  Object.assign((...keys: string[]) => {
    let result = "";
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) result += " ";
      result += classes[keys[i]] as string;
    }
    return result;
  }, classes ?? {}) as Join<T> & T;

const resolve = <const T extends ClassNames>(
  classify: Classify,
  classes: T
): T => {
  if (classify === undefined) return classes;
  if (typeof classify === "function")
    return Object.fromEntries(
      Object.entries(classes).map(([key, value]) => [
        key,
        typeof value === "function"
          ? (...args: any[]) => classify(value(...args))
          : classify(value),
      ])
    ) as T;
  else if (typeof classify === "object")
    return resolve(classify.classify, classes);
  else return classes;
};

export const classified = <const T extends ClassNames>(
  classify: Classify,
  classes: T
) => joinable(resolve(classify, classes));
