// Simple logger utility
const DEBUG = import.meta.env.DEV || localStorage.getItem("debug") === "true";

export function log(namespace: string, ...args: unknown[]) {
  if (DEBUG) {
    console.log(`%c[${namespace}]`, 'color: orange;', ...args);
  }
}

// Optional: Add other log levels (info, warn, error) if needed
// export function info(namespace: string, ...args: any[]) {
//   console.info(`[${namespace}]`, ...args);
// }

// export function warn(namespace: string, ...args: any[]) {
//   console.warn(`[${namespace}]`, ...args);
// }

// export function error(namespace: string, ...args: any[]) {
//   console.error(`[${namespace}]`, ...args);
// }
