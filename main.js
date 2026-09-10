const { app, BrowserWindow, Menu, Tray, nativeImage, nativeTheme, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_TITLE = '날짜별 메모';
const AUTHOR = 'goni';

let win = null;
let tray = null;

const settings = { alwaysOnTop: false, minimizeToTray: true, deleteLock: true, bounds: null };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try { Object.assign(settings, JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))); } catch {}
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch {}
}

function loadIcon(file) {
  return nativeImage.createFromBuffer(fs.readFileSync(path.join(__dirname, 'assets', file)));
}

const titleText = () => `${APP_TITLE}  v${app.getVersion()}`;

/* ── 설정 토글 ── */
function setAlwaysOnTop(value) {
  settings.alwaysOnTop = value;
  win.setAlwaysOnTop(value);
  saveSettings();
  applyMenus();
  pushState();
}
function setMinimizeToTray(value) {
  settings.minimizeToTray = value;
  saveSettings();
  applyMenus();
  pushState();
}
function setDeleteLock(value) {
  settings.deleteLock = value;
  saveSettings();
  pushState();
}

// 메뉴바는 HTML로 그리므로, 렌더러가 체크 상태를 알아야 한다.
const menuState = () => ({
  alwaysOnTop: settings.alwaysOnTop,
  minimizeToTray: settings.minimizeToTray,
  deleteLock: settings.deleteLock,
});
function pushState() {
  if (win && !win.isDestroyed()) win.webContents.send('menu:state', menuState());
}

/* ── 트레이 ── */
function hideToTray() {
  if (!tray) {
    tray = new Tray(loadIcon('tray.png'));
    tray.setToolTip(titleText());
    tray.on('click', showWindow);
    tray.on('double-click', showWindow);
  }
  applyMenus();
  win.hide();
}

// 숨긴 창은 isMinimized()가 false를 돌려주므로 show() 뒤에 restore()를 무조건 부른다.
// 트레이는 창을 되살린 뒤에 없앤다 - 먼저 지우면 복원 실패 시 앱에 접근할 길이 사라진다.
function showWindow() {
  win.show();
  win.restore();
  win.focus();
  if (tray) { tray.destroy(); tray = null; }
}

/* ── 메뉴 ── */
// 메뉴바는 렌더러가 HTML로 그린다. 네이티브 메뉴를 남겨두면 setApplicationMenu를
// 다시 부를 때마다 숨겨둔 메뉴바가 되살아나므로, 단축키는 before-input-event로 받는다.
function applyMenus() {
  if (tray) {
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '열기', click: showWindow },
      {
        label: '항상 위에 표시',
        type: 'checkbox',
        checked: settings.alwaysOnTop,
        click: item => setAlwaysOnTop(item.checked),
      },
      { type: 'separator' },
      { label: '종료', role: 'quit' },
    ]));
  }
}

function showAbout() {
  dialog.showMessageBox(win, {
    type: 'info',
    title: '정보',
    message: `${APP_TITLE}   v${app.getVersion()}`,
    detail: `제작자: ${AUTHOR}\nElectron ${process.versions.electron}\n\n하루 단위로 메모를 남기고 완료 표시를 할 수 있습니다.`,
    buttons: ['확인'],
  });
}

/* ── 창 ── */
function createWindow() {
  win = new BrowserWindow({
    width: 460,
    height: 740,
    minWidth: 360,
    minHeight: 440,
    ...(settings.bounds || {}),
    title: titleText(),
    icon: loadIcon('icon.png'),
    backgroundColor: '#f5f5f3',
    alwaysOnTop: settings.alwaysOnTop,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !input.control || input.alt || input.meta) return;
    const key = (input.key || '').toLowerCase();
    if (key === 't') { e.preventDefault(); setAlwaysOnTop(!settings.alwaysOnTop); }
    else if (key === 'q') { e.preventDefault(); app.quit(); }
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', e => e.preventDefault());

  win.on('minimize', e => {
    if (settings.minimizeToTray) {
      e.preventDefault();
      hideToTray();
    }
  });

  win.on('close', () => {
    if (!win.isMinimized() && !win.isFullScreen()) settings.bounds = win.getBounds();
    saveSettings();
  });
}

/* ── 앱 수명주기 ── */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) showWindow(); });

  app.whenReady().then(() => {
    nativeTheme.themeSource = 'light';
    Menu.setApplicationMenu(null);
    loadSettings();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());

  ipcMain.handle('menu:state', () => menuState());
  ipcMain.handle('menu:action', (_e, name) => {
    switch (name) {
      case 'quit': app.quit(); break;
      case 'toggleAlwaysOnTop': setAlwaysOnTop(!settings.alwaysOnTop); break;
      case 'toggleMinimizeToTray': setMinimizeToTray(!settings.minimizeToTray); break;
      case 'toggleDeleteLock': setDeleteLock(!settings.deleteLock); break;
      case 'about': showAbout(); break;
    }
    return menuState();
  });
}
