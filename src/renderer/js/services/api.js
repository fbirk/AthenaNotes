const bridge = window.knowledgeBase ?? {};

function ensureBridge() {
  if (typeof bridge.invoke !== 'function') {
    throw new Error('IPC bridge is unavailable.');
  }
}

export function invoke(channel, payload) {
  ensureBridge();
  return bridge.invoke(channel, payload);
}

export function subscribe(channel, listener) {
  if (typeof bridge.on !== 'function') {
    return () => {};
  }
  return bridge.on(channel, listener);
}
