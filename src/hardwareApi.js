const configuredOrigin = String(import.meta.env.VITE_KIOSK_HARDWARE_ORIGIN || '').trim().replace(/\/+$/, '');

const shouldUseLocalEdge = () => {
  if (configuredOrigin) return true;
  if (typeof window === 'undefined') return false;
  // A hosted kiosk uses a loopback edge agent for its locally attached DSLR/printer.
  // Local development remains compatible with the existing in-process API.
  return !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
};

const getHardwareOrigin = () => configuredOrigin || 'http://127.0.0.1:8787';

export const getHardwareUrl = (path) => shouldUseLocalEdge() ? `${getHardwareOrigin()}${path}` : path;

export const hardwareFetch = (path, options) => {
  return fetch(getHardwareUrl(path), options);
};

export const isUsingLocalHardwareEdge = () => shouldUseLocalEdge();
