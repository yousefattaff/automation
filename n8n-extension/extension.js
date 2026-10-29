const vscode = require('vscode');
const http = require('http');
const https = require('https');

let activeWebviewPanel = null;
let statusBarItem = null;
let statusInterval = null;
let lastKnownStatus = { online: false, checking: true, url: 'http://localhost:5678' };

function getN8nUrl() {
  const config = vscode.workspace.getConfiguration('n8n');
  return config.get('url', 'http://localhost:5678').trim().replace(/\/$/, '');
}

/**
 * Pings n8n endpoint to check health
 */
function checkServerHealth(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const startTime = Date.now();

      const req = client.request({
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: '/healthz',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        const latency = Date.now() - startTime;
        resolve({ online: true, statusCode: res.statusCode, latency });
      });

      req.on('error', () => {
        // Fallback: test root path if /healthz fails
        const fallbackReq = client.request({
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: '/',
          method: 'GET',
          timeout: 2000
        }, (res) => {
          const latency = Date.now() - startTime;
          resolve({ online: true, statusCode: res.statusCode, latency });
        });

        fallbackReq.on('error', () => resolve({ online: false, latency: 0 }));
        fallbackReq.on('timeout', () => { fallbackReq.destroy(); resolve({ online: false, latency: 0 }); });
        fallbackReq.end();
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ online: false, latency: 0 });
      });

      req.end();
    } catch {
      resolve({ online: false, latency: 0 });
    }
  });
}

/**
 * Updates status bar text and tooltip
 */
async function updateServerStatus(sidebarProvider) {
  const url = getN8nUrl();
  const status = await checkServerHealth(url);
  lastKnownStatus = { ...status, checking: false, url };

  if (statusBarItem) {
    if (status.online) {
      statusBarItem.text = `$(zap) n8n: Online`;
      statusBarItem.tooltip = `n8n is Online at ${url} (${status.latency}ms)\nClick to open in editor tab`;
      statusBarItem.color = '#73c991';
    } else {
      statusBarItem.text = `$(plug) n8n: Offline`;
      statusBarItem.tooltip = `n8n is Offline (${url})\nClick to open or start instance`;
      statusBarItem.color = '#cca700';
    }
  }

  if (sidebarProvider) {
    sidebarProvider.sendStatusUpdate(lastKnownStatus);
  }

  if (activeWebviewPanel) {
    activeWebviewPanel.webview.postMessage({
      type: 'statusUpdate',
      status: lastKnownStatus
    });
  }

  return lastKnownStatus;
}

/**
 * Finds or starts n8n in an integrated terminal
 */
function startN8nTerminal() {
  let terminal = vscode.window.terminals.find(t => t.name === 'n8n Server');
  if (!terminal) {
    terminal = vscode.window.createTerminal('n8n Server');
  }
  terminal.show();
  terminal.sendText('npx n8n');
  vscode.window.showInformationMessage('Starting n8n via "npx n8n" in the integrated terminal...');
}

/**
 * Generates HTML for the Editor Tab Webview
 */
function getWebviewContent(n8nUrl, status) {
  const isOnline = status.online;
  const isCloud = n8nUrl.includes('.n8n.cloud');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src * http: https:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>n8n Workbench</title>
  <style>
    :root {
      --bg: #111418;
      --card-bg: #1c2128;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #EA4B71;
      --accent-hover: #ff5e85;
      --green: #2ea043;
      --yellow: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 42px;
      padding: 0 12px;
      background: #161b22;
      border-bottom: 1px solid var(--border);
      gap: 12px;
      flex-shrink: 0;
      user-select: none;
    }
    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      background: rgba(234, 75, 113, 0.15);
      color: var(--accent);
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .url-display {
      background: #0d1117;
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background: ${isOnline ? 'var(--green)' : 'var(--yellow)'};
      box-shadow: 0 0 8px ${isOnline ? 'rgba(46, 160, 67, 0.6)' : 'rgba(210, 153, 34, 0.6)'};
    }
    .btn {
      background: #21262d;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #30363d;
      border-color: #8b949e;
    }
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
      font-weight: 600;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }
    .cloud-banner {
      background: linear-gradient(90deg, #2c1a24 0%, #161b22 100%);
      border-bottom: 1px solid rgba(234, 75, 113, 0.4);
      padding: 8px 16px;
      font-size: 12px;
      display: ${isCloud ? 'flex' : 'none'};
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
    }
    .iframe-wrapper {
      flex: 1;
      width: 100%;
      height: 100%;
      position: relative;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: ${isOnline && !isCloud ? 'block' : 'none'};
      background: var(--bg);
    }
    .cloud-card-overlay {
      display: ${isCloud ? 'flex' : 'none'};
      position: absolute;
      inset: 0;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      background: radial-gradient(circle at center, #1f242c 0%, #0d1117 100%);
    }
    .offline-overlay {
      display: ${!isOnline && !isCloud ? 'flex' : 'none'};
      position: absolute;
      inset: 0;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      background: radial-gradient(circle at center, #1c2128 0%, #111418 100%);
    }
    .card {
      background: rgba(22, 27, 34, 0.92);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 36px 32px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(12px);
    }
    .card h2 {
      font-size: 20px;
      margin-bottom: 10px;
      color: var(--text);
    }
    .card p {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .action-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-large {
      padding: 12px 18px;
      font-size: 13px;
      justify-content: center;
      border-radius: 8px;
    }
    .code-box {
      margin-top: 18px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      color: #79c0ff;
      text-align: left;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo-container">
        <svg width="24" height="14" viewBox="0 0 228 120" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M204 48C192.817 48 183.42 40.3514 180.756 30H153.248C147.382 30 142.376 34.241 141.412 40.0272L140.425 45.9456C139.489 51.5648 136.646 56.4554 132.626 60C136.646 63.5446 139.489 68.4352 140.425 74.0544L141.412 79.9728C142.376 85.759 147.382 90 153.248 90H156.756C159.42 79.6486 168.817 72 180 72C193.255 72 204 82.7452 204 96C204 109.255 193.255 120 180 120C168.817 120 159.42 112.351 156.756 102H153.248C141.516 102 131.504 93.5181 129.575 81.9456L128.588 76.0272C127.624 70.241 122.618 66 116.752 66H107.244C104.58 76.3514 95.183 84 84 84C72.817 84 63.4204 76.3514 60.7561 66H47.2439C44.5796 76.3514 35.183 84 24 84C10.7452 84 0 73.2548 0 60C0 46.7452 10.7452 36 24 36C35.183 36 44.5796 43.6486 47.2439 54H60.7561C63.4204 43.6486 72.817 36 84 36C95.183 36 104.58 43.6486 107.244 54H116.752C122.618 54 127.624 49.759 128.588 43.9728L129.575 38.0544C131.504 26.4819 141.516 18 153.248 18L180.756 18C183.42 7.64864 192.817 0 204 0C217.255 0 228 10.7452 228 24C228 37.2548 217.255 48 204 48ZM204 36C210.627 36 216 30.6274 216 24C216 17.3726 210.627 12 204 12C197.373 12 192 17.3726 192 24C192 30.6274 197.373 36 204 36ZM24 72C30.6274 72 36 66.6274 36 60C36 53.3726 30.6274 48 24 48C17.3726 48 12 53.3726 12 60C12 66.6274 17.3726 72 24 72ZM96 60C96 66.6274 90.6274 72 84 72C77.3726 72 72 66.6274 72 60C72 53.3726 77.3726 48 84 48C90.6274 48 96 53.3726 96 60ZM192 96C192 102.627 186.627 108 180 108C173.373 108 168 102.627 168 96C168 89.3726 173.373 84 180 84C186.627 84 192 89.3726 192 96Z" fill="#EA4B71"/>
        </svg>
        <span>n8n</span>
        <span class="logo-badge">WORKBENCH</span>
      </div>
      <div class="url-display">
        <span class="status-dot" id="status-dot"></span>
        <span id="current-url">${n8nUrl}</span>
      </div>
    </div>
    <div class="toolbar-right">
      <button class="btn" id="btn-reload" title="Reload iframe">🔄 Reload</button>
      <button class="btn" id="btn-external" title="Open in default web browser">🌐 External Browser</button>
      <button class="btn" id="btn-simple" title="Open in VS Code Simple Browser">◫ Simple Browser</button>
      <button class="btn" id="btn-config" title="Configure n8n URL">⚙️ URL</button>
    </div>
  </div>

  <div class="cloud-banner" id="cloud-banner">
    <span>🔒 <strong>n8n Cloud Security:</strong> n8n Cloud blocks iframe embedding. Launch directly or switch to local hosting.</span>
    <button class="btn btn-primary" id="btn-banner-open">🌐 Open in Browser</button>
  </div>

  <div class="iframe-wrapper">
    <iframe id="n8n-frame" src="${isOnline && !isCloud ? n8nUrl : 'about:blank'}" allow="clipboard-read; clipboard-write;" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"></iframe>

    <div class="cloud-card-overlay" id="cloud-overlay">
      <div class="card">
        <div style="font-size: 38px; margin-bottom: 12px;">☁️</div>
        <h2>n8n Cloud Workspace</h2>
        <p>n8n Cloud blocks embedding inside editor iframes to protect your account (<em>X-Frame-Options: SAMEORIGIN</em>). Click below to open your cloud workspace directly, or switch to local hosting for embedded editing.</p>
        
        <div class="action-stack">
          <button class="btn btn-primary btn-large" id="btn-cloud-open">
            🌐 Open in Web Browser
          </button>
          <button class="btn btn-large" id="btn-cloud-simple">
            ◫ Open in Simple Browser Tab
          </button>
          <button class="btn btn-large" id="btn-switch-local">
            💻 Switch to Local (http://localhost:5678)
          </button>
        </div>
      </div>
    </div>

    <div class="offline-overlay" id="offline-overlay">
      <div class="card">
        <div class="card-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d29922" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>n8n Server is Offline</h2>
        <p>Unable to connect to your n8n instance at <strong id="card-url" style="color:#e6edf3;">${n8nUrl}</strong>. Start your local server or update your connection settings.</p>
        
        <div class="action-stack">
          <button class="btn btn-primary btn-large" id="btn-start-server">
            🚀 Start Local Server (npx n8n)
          </button>
          <button class="btn btn-large" id="btn-retry">
            🔄 Retry Connection
          </button>
          <button class="btn btn-large" id="btn-change-url">
            ⚙️ Configure URL
          </button>
        </div>

        <div class="code-box">
          <code>docker run -it --rm -p 5678:5678 n8nio/n8n</code>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const frame = document.getElementById('n8n-frame');
    const overlay = document.getElementById('offline-overlay');
    const cloudOverlay = document.getElementById('cloud-overlay');
    const cloudBanner = document.getElementById('cloud-banner');
    const statusDot = document.getElementById('status-dot');
    const currentUrlText = document.getElementById('current-url');
    const cardUrlText = document.getElementById('card-url');

    document.getElementById('btn-reload').addEventListener('click', () => {
      frame.src = frame.src;
    });

    document.getElementById('btn-external').addEventListener('click', () => {
      vscode.postMessage({ type: 'openExternal' });
    });

    const bannerOpen = document.getElementById('btn-banner-open');
    if (bannerOpen) {
      bannerOpen.addEventListener('click', () => vscode.postMessage({ type: 'openExternal' }));
    }

    const cloudOpen = document.getElementById('btn-cloud-open');
    if (cloudOpen) {
      cloudOpen.addEventListener('click', () => vscode.postMessage({ type: 'openExternal' }));
    }

    const cloudSimple = document.getElementById('btn-cloud-simple');
    if (cloudSimple) {
      cloudSimple.addEventListener('click', () => vscode.postMessage({ type: 'openSimpleBrowser' }));
    }

    const switchLocal = document.getElementById('btn-switch-local');
    if (switchLocal) {
      switchLocal.addEventListener('click', () => vscode.postMessage({ type: 'switchLocal' }));
    }

    document.getElementById('btn-simple').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSimpleBrowser' });
    });

    document.getElementById('btn-config').addEventListener('click', () => {
      vscode.postMessage({ type: 'configureUrl' });
    });

    document.getElementById('btn-start-server').addEventListener('click', () => {
      vscode.postMessage({ type: 'startServer' });
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      vscode.postMessage({ type: 'checkStatus' });
    });

    document.getElementById('btn-change-url').addEventListener('click', () => {
      vscode.postMessage({ type: 'configureUrl' });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'statusUpdate') {
        const s = message.status;
        currentUrlText.textContent = s.url;
        cardUrlText.textContent = s.url;

        if (s.online) {
          statusDot.style.background = 'var(--green)';
          statusDot.style.boxShadow = '0 0 8px rgba(46, 160, 67, 0.6)';
          overlay.style.display = 'none';
          frame.style.display = 'block';
          if (!frame.src || frame.src === 'about:blank') {
            frame.src = s.url;
          }
        } else {
          statusDot.style.background = 'var(--yellow)';
          statusDot.style.boxShadow = '0 0 8px rgba(210, 153, 34, 0.6)';
          overlay.style.display = 'flex';
          frame.style.display = 'none';
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Sidebar View Provider for Activity Bar
 */
class N8nSidebarProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getSidebarHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'openEditor':
          vscode.commands.executeCommand('n8n.openEditor');
          break;
        case 'openBeside':
          vscode.commands.executeCommand('n8n.openBeside');
          break;
        case 'openBrowser':
          vscode.commands.executeCommand('n8n.openBrowser');
          break;
        case 'startServer':
          vscode.commands.executeCommand('n8n.startServer');
          break;
        case 'configureUrl':
          vscode.commands.executeCommand('n8n.configureUrl');
          break;
        case 'refresh':
          await updateServerStatus(this);
          break;
        case 'openFile':
          if (message.path) {
            const doc = await vscode.workspace.openTextDocument(message.path);
            await vscode.window.showTextDocument(doc);
          }
          break;
      }
    });

    // Send initial status
    this.sendStatusUpdate(lastKnownStatus);
  }

  sendStatusUpdate(status) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'statusUpdate',
        status
      });
    }
  }

  _getSidebarHtml() {
    const url = getN8nUrl();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --accent: #EA4B71;
      --accent-hover: #ff5e85;
      --green: #2ea043;
      --yellow: #d29922;
      --card: var(--vscode-sideBar-background);
      --border: var(--vscode-widget-border, #30363d);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 14px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .header h2 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .status-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .status-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      font-weight: 600;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(210, 153, 34, 0.15);
      color: var(--yellow);
    }
    .badge.online {
      background: rgba(46, 160, 67, 0.15);
      color: var(--green);
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    .url-text {
      font-family: monospace;
      font-size: 11px;
      color: var(--vscode-textLink-foreground);
      word-break: break-all;
    }
    .action-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--vscode-button-secondaryBackground, #21262d);
      color: var(--vscode-button-secondaryForeground, #ffffff);
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #30363d);
    }
    .action-btn.primary {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
      font-weight: 600;
    }
    .action-btn.primary:hover {
      background: var(--accent-hover);
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin: 16px 0 8px 0;
      letter-spacing: 0.5px;
    }
    .shortcut-tip {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 14px;
      text-align: center;
    }
    kbd {
      background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.2));
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 1px 4px;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <svg width="28" height="16" viewBox="0 0 228 120" fill="none">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M204 48C192.817 48 183.42 40.3514 180.756 30H153.248C147.382 30 142.376 34.241 141.412 40.0272L140.425 45.9456C139.489 51.5648 136.646 56.4554 132.626 60C136.646 63.5446 139.489 68.4352 140.425 74.0544L141.412 79.9728C142.376 85.759 147.382 90 153.248 90H156.756C159.42 79.6486 168.817 72 180 72C193.255 72 204 82.7452 204 96C204 109.255 193.255 120 180 120C168.817 120 159.42 112.351 156.756 102H153.248C141.516 102 131.504 93.5181 129.575 81.9456L128.588 76.0272C127.624 70.241 122.618 66 116.752 66H107.244C104.58 76.3514 95.183 84 84 84C72.817 84 63.4204 76.3514 60.7561 66H47.2439C44.5796 76.3514 35.183 84 24 84C10.7452 84 0 73.2548 0 60C0 46.7452 10.7452 36 24 36C35.183 36 44.5796 43.6486 47.2439 54H60.7561C63.4204 43.6486 72.817 36 84 36C95.183 36 104.58 43.6486 107.244 54H116.752C122.618 54 127.624 49.759 128.588 43.9728L129.575 38.0544C131.504 26.4819 141.516 18 153.248 18L180.756 18C183.42 7.64864 192.817 0 204 0C217.255 0 228 10.7452 228 24C228 37.2548 217.255 48 204 48ZM204 36C210.627 36 216 30.6274 216 24C216 17.3726 210.627 12 204 12C197.373 12 192 17.3726 192 24C192 30.6274 197.373 36 204 36ZM24 72C30.6274 72 36 66.6274 36 60C36 53.3726 30.6274 48 24 48C17.3726 48 12 53.3726 12 60C12 66.6274 17.3726 72 24 72ZM96 60C96 66.6274 90.6274 72 84 72C77.3726 72 72 66.6274 72 60C72 53.3726 77.3726 48 84 48C90.6274 48 96 53.3726 96 60ZM192 96C192 102.627 186.627 108 180 108C173.373 108 168 102.627 168 96C168 89.3726 173.373 84 180 84C186.627 84 192 89.3726 192 96Z" fill="#EA4B71"/>
    </svg>
    <h2>n8n Automation</h2>
  </div>

  <div class="status-card">
    <div class="status-row">
      <span class="status-label">Status</span>
      <span class="badge" id="sidebar-badge">
        <span class="dot"></span>
        <span id="badge-text">CHECKING...</span>
      </span>
    </div>
    <div class="status-row">
      <span class="status-label">Instance</span>
      <span class="url-text" id="sidebar-url">${url}</span>
    </div>
  </div>

  <button class="action-btn primary" id="btn-open-editor">
    ⚡ Open in Editor Tab
  </button>
  <button class="action-btn" id="btn-open-beside">
    ◫ Open Beside Code
  </button>
  <button class="action-btn" id="btn-open-browser">
    🌐 Open in Browser
  </button>

  <div class="section-title">Server Controls</div>
  <button class="action-btn" id="btn-start-server">
    🚀 Start Server (npx n8n)
  </button>
  <button class="action-btn" id="btn-refresh">
    🔄 Refresh Status
  </button>
  <button class="action-btn" id="btn-change-url">
    ⚙️ Configure URL
  </button>

  <div class="shortcut-tip">
    Tip: Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>N</kbd> anywhere to open n8n!
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const badge = document.getElementById('sidebar-badge');
    const badgeText = document.getElementById('badge-text');
    const urlText = document.getElementById('sidebar-url');

    document.getElementById('btn-open-editor').addEventListener('click', () => vscode.postMessage({ type: 'openEditor' }));
    document.getElementById('btn-open-beside').addEventListener('click', () => vscode.postMessage({ type: 'openBeside' }));
    document.getElementById('btn-open-browser').addEventListener('click', () => vscode.postMessage({ type: 'openBrowser' }));
    document.getElementById('btn-start-server').addEventListener('click', () => vscode.postMessage({ type: 'startServer' }));
    document.getElementById('btn-refresh').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
    document.getElementById('btn-change-url').addEventListener('click', () => vscode.postMessage({ type: 'configureUrl' }));

    window.addEventListener('message', event => {
      const { type, status } = event.data;
      if (type === 'statusUpdate' && status) {
        urlText.textContent = status.url;
        if (status.online) {
          badge.className = 'badge online';
          badgeText.textContent = 'ONLINE (' + status.latency + 'ms)';
        } else {
          badge.className = 'badge';
          badgeText.textContent = 'OFFLINE';
        }
      }
    });
  </script>
</body>
</html>`;
  }
}

/**
 * Extension Activation
 */
function activate(context) {
  const sidebarProvider = new N8nSidebarProvider(context.extensionUri);

  // Register Webview View Provider for the Activity Bar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('n8n.sidebarView', sidebarProvider)
  );

  // Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'n8n.openEditor';
  statusBarItem.text = `$(plug) n8n`;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Command: Open in Editor Tab
  const openEditorCmd = vscode.commands.registerCommand('n8n.openEditor', async () => {
    const n8nUrl = getN8nUrl();
    try {
      await vscode.commands.executeCommand('simpleBrowser.show', vscode.Uri.parse(n8nUrl));
    } catch {
      vscode.env.openExternal(vscode.Uri.parse(n8nUrl));
    }
    await updateServerStatus(sidebarProvider);
  });

  // Command: Open Beside
  const openBesideCmd = vscode.commands.registerCommand('n8n.openBeside', async () => {
    const n8nUrl = getN8nUrl();
    try {
      await vscode.commands.executeCommand('simpleBrowser.show', vscode.Uri.parse(n8nUrl));
    } catch {
      vscode.env.openExternal(vscode.Uri.parse(n8nUrl));
    }
  });

  // Command: Open External Browser
  const openBrowserCmd = vscode.commands.registerCommand('n8n.openBrowser', () => {
    const url = getN8nUrl();
    vscode.env.openExternal(vscode.Uri.parse(url));
  });

  // Command: Open via built-in Simple Browser
  const openSimpleBrowserCmd = vscode.commands.registerCommand('n8n.openSimpleBrowser', async () => {
    const url = getN8nUrl();
    try {
      await vscode.commands.executeCommand('simpleBrowser.show', vscode.Uri.parse(url));
    } catch {
      vscode.env.openExternal(vscode.Uri.parse(url));
    }
  });

  // Command: Start Local Server
  const startServerCmd = vscode.commands.registerCommand('n8n.startServer', () => {
    startN8nTerminal();
  });

  // Command: Check Status
  const checkStatusCmd = vscode.commands.registerCommand('n8n.checkStatus', async () => {
    const status = await updateServerStatus(sidebarProvider);
    if (status.online) {
      vscode.window.showInformationMessage(`n8n is ONLINE at ${status.url} (latency: ${status.latency}ms)`);
    } else {
      const choice = await vscode.window.showWarningMessage(
        `n8n is OFFLINE at ${status.url}`,
        'Start Server',
        'Configure URL'
      );
      if (choice === 'Start Server') {
        vscode.commands.executeCommand('n8n.startServer');
      } else if (choice === 'Configure URL') {
        vscode.commands.executeCommand('n8n.configureUrl');
      }
    }
  });

  // Command: Configure URL
  const configureUrlCmd = vscode.commands.registerCommand('n8n.configureUrl', async () => {
    const currentUrl = getN8nUrl();
    const newUrl = await vscode.window.showInputBox({
      prompt: 'Enter the URL of your n8n instance',
      value: currentUrl,
      placeHolder: 'http://localhost:5678'
    });

    if (newUrl && newUrl.trim() !== '') {
      await vscode.workspace.getConfiguration('n8n').update('url', newUrl.trim(), vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`n8n URL updated to: ${newUrl.trim()}`);
      await updateServerStatus(sidebarProvider);
    }
  });

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('n8n.url')) {
        await updateServerStatus(sidebarProvider);
      }
    })
  );

  // Register commands
  context.subscriptions.push(
    openEditorCmd,
    openBesideCmd,
    openBrowserCmd,
    openSimpleBrowserCmd,
    startServerCmd,
    checkStatusCmd,
    configureUrlCmd
  );

  // Initial status check & periodic polling
  updateServerStatus(sidebarProvider);
  statusInterval = setInterval(() => {
    updateServerStatus(sidebarProvider);
  }, 15000);
}

function deactivate() {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
}

module.exports = {
  activate,
  deactivate
};
