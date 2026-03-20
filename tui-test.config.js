import { defineConfig } from '@microsoft/tui-test';

export default defineConfig({
  timeout: 30000,
  retries: 0,
  workers: 1,
  testMatch: 'tests/tui/**/*.test.js',
  expect: {
    timeout: 10000,
  },
  use: {
    rows: 30,
    columns: 120,
  },
});
