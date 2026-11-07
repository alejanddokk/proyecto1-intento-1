import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { chromium } from 'file:///C:/Users/Jorge/.codex/tools/landing-quality/node_modules/playwright/index.mjs';

const server = spawn(process.execPath, [
  'C:/Users/Jorge/.codex/tools/landing-quality/node_modules/@playwright/mcp/cli.js',
  '--headless', '--isolated', '--caps', 'testing', '--executable-path', chromium.executablePath(),
], { stdio: ['pipe', 'pipe', 'pipe'] });
let sequence = 0;
const pending = new Map();
createInterface({ input: server.stdout }).on('line', line => {
  const message = JSON.parse(line);
  const listener = pending.get(message.id);
  if (listener) {
    pending.delete(message.id);
    message.error ? listener.reject(new Error(JSON.stringify(message.error))) : listener.resolve(message.result);
  }
});
server.stderr.on('data', data => process.stderr.write(data));
function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
const timeout = setTimeout(() => { server.kill(); process.exitCode = 1; console.error('MCP verification timed out'); }, 45000);
try {
  const initialized = await request('initialize', {
    protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'setup-verification', version: '1.0.0' },
  });
  console.log('MCP initialized:', JSON.stringify(initialized.serverInfo));
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const catalog = await request('tools/list', {});
  for (const name of ['browser_navigate', 'browser_snapshot', 'browser_fill_form', 'browser_press_key', 'browser_verify_element_visible']) {
    if (!catalog.tools.some(tool => tool.name === name)) throw new Error('Missing tool: ' + name);
  }
  console.log('Browser, form, keyboard and testing tools verified');
  for (const [name, args] of [['browser_navigate', { url: 'about:blank' }], ['browser_snapshot', {}], ['browser_close', {}]]) {
    const result = await request('tools/call', { name, arguments: args });
    if (result.isError) throw new Error(JSON.stringify(result));
    console.log(name + ': OK');
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  server.stdin.end();
  server.kill();
}
