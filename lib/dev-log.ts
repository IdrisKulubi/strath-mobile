const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export function devLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

export function devWarn(...args: unknown[]) {
  if (isDev) console.warn(...args);
}

export function devError(...args: unknown[]) {
  if (isDev) console.error(...args);
}
