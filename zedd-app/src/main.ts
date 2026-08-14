import * as remoteMain from '@electron/remote/main'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { autoUpdater } from 'electron-updater'

remoteMain.initialize()

global.isDev = process.argv.includes('--dev')

global.appUserModelId = global.isDev ? process.execPath : 'com.squirrel.zedd.zedd-app'
app.setAppUserModelId(global.appUserModelId)
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit()
}
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | undefined

app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

let userQuit: boolean = false
const createWindow = () => {
  if (global.isDev) {
    // BrowserWindow.addDevToolsExtension(
    //   path.join(
    //     homedir(),
    //     // react-devtools
    //     'AppData/Local/Google/Chrome/User Data/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/4.8.2_0',
    //   ),
    // )
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false,
    },
  })
  remoteMain.enable(mainWindow.webContents)

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

  if (global.isDev) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
  }

  // This must be done here, because registered callbacks in the renderer
  // process are async and preventDefault is ignored
  mainWindow.on('close', (e) => {
    if (!userQuit) {
      e.preventDefault()
    }
  })
  // mainWindow.on('minimize', () => mainWindow!.hide())

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = undefined
  })
}

ipcMain.on('quit', () => {
  userQuit = true
  app.quit()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'zedd-app'
    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })
  createWindow()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (null === mainWindow) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const DEFAULT_UPDATE_SERVER = 'https://github.com/125m125/zedd2'
let updaterInitialized = false
let cleanupUpdater: (() => void) | undefined

function isUpdateEnabled(): boolean {
  if (process.platform !== 'win32') return false
  if (global.isDev && !process.argv.includes('--force-update')) return false
  return true
}

function setupAutoUpdater(_feedUrl: string) {
  const log = (...x: any[]) => console.log('[UPDATER]', ...x)

  if (!isUpdateEnabled()) {
    log('Disabled: not on Windows or dev mode')
    return () => {}
  }

  log(`Configuring GitHub updater`)
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: '125m125',
    repo: 'zedd2',
  })

  // Allow update checks in dev mode (unpacked app)
  autoUpdater.forceDevUpdateConfig = global.isDev && process.argv.includes('--force-update')

  // Disable auto-download — we want to confirm with the user first
  autoUpdater.autoDownload = false

  let checkInterval: ReturnType<typeof setInterval>

  autoUpdater.on('checking-for-update', () => log('Checking for updates...'))
  autoUpdater.on('update-available', (info) => {
    log('Update available:', info.version)
    // Send release notes so renderer can show them to the user
    mainWindow?.webContents.send('updater-update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes || '',
    })
  })
  autoUpdater.on('update-not-available', (info) => log('No update available:', info.version))
  autoUpdater.on('download-progress', (progress) => {
    log(`Downloading: ${progress.percent.toFixed(0)}%`)
  })
  autoUpdater.on('update-downloaded', (event) => {
    log('Update downloaded:', event.version)
    mainWindow?.webContents.send('updater-downloaded', { releaseName: event.version, releaseNotes: event.releaseNotes })
  })
  autoUpdater.on('error', (error: Error) => log('Error:', error, error.message))

  log('Initial check for updates...')
  autoUpdater.checkForUpdates()

  checkInterval = setInterval(() => {
    log('Periodic check for updates...')
    autoUpdater.checkForUpdates()
  }, 2 * 60 * 60 * 1000) // every 2 hours

  // IPC: manual check on demand
  ipcMain.on('updater-check', () => {
    log('Manual check requested')
    autoUpdater.checkForUpdates()
  })

  // IPC: user confirmed, start download
  ipcMain.on('updater-confirm', () => {
    log('User confirmed update, starting download...')
    autoUpdater.downloadUpdate()
  })

  // IPC: user wants to quit and install
  ipcMain.on('updater-quit-and-install', () => {
    log('Quitting and installing update...')
    autoUpdater.quitAndInstall()
  })

  return () => {
    clearInterval(checkInterval)
    autoUpdater.removeAllListeners()
  }
}

// Listen for feed URL from renderer (it reads settings)
ipcMain.on('updater-init', (_event, feedUrl: string) => {
  if (updaterInitialized) return
  updaterInitialized = true
  cleanupUpdater = setupAutoUpdater(feedUrl)
})

// Also start with default if renderer doesn't send one quickly
setTimeout(() => {
  if (isUpdateEnabled() && !updaterInitialized) {
    updaterInitialized = true
    cleanupUpdater = setupAutoUpdater(DEFAULT_UPDATE_SERVER)
  }
}, 30_000)

// Clean up updater interval on quit
app.on('will-quit', () => {
  cleanupUpdater?.()
})
