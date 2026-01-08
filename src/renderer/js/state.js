export function createAppState() {
  return {
    currentRoute: '#/setup',
    storageConfigured: false,
    data: Object.create(null),
  };
}

export function updateState(state, patch) {
  Object.assign(state, patch);
  return state;
}
