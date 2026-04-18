import { app, BrowserWindow, globalShortcut, ipcMain, clipboard, nativeImage, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { getConfig, setConfig } from './store'

let mainWindow: BrowserWindow | null = null
let isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const config = getConfig()

  mainWindow = new BrowserWindow({
    title: 'ClipNote',
    icon: path.join(__dirname, '../assets/icon.png'),
    width: config.windowWidth || 1300,
    height: config.windowHeight || 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 注册全局快捷键
  registerShortcuts(mainWindow)
}

// ===================== IPC Handlers =====================

// 保存剪贴板
ipcMain.handle('clipboard:save', async () => {
  const config = getConfig()
  const saveDir = config.saveDirectory || path.join(app.getPath('documents'), 'ClipNotes')
  fs.mkdirSync(saveDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const image = clipboard.readImage()
  const text = clipboard.readText()

  if (!image.isEmpty()) {
    // 保存图片
    const imgDir = path.join(saveDir, 'assets')
    fs.mkdirSync(imgDir, { recursive: true })
    const imgFilename = `img-${timestamp}.png`
    const imgPath = path.join(imgDir, imgFilename)
    fs.writeFileSync(imgPath, image.toPNG())

    // 生成 Markdown（关键：正确的 Markdown 图片语法）
    const mdFilename = `clip-img-${timestamp}.md`
    const mdPath = path.join(saveDir, mdFilename)
    const relativePath = `assets/${imgFilename}`
    const mdContent = `# 剪贴板图像 ${timestamp}\n\n![${imgFilename}](${relativePath})\n`
    fs.writeFileSync(mdPath, mdContent, 'utf-8')
    return { success: true, filePath: mdPath, type: 'image' }
  } else if (text) {
    const filename = `clip-${timestamp}.md`
    const filepath = path.join(saveDir, filename)
    const content = `# 剪贴板 ${timestamp}\n\n${text}\n`
    fs.writeFileSync(filepath, content, 'utf-8')
    return { success: true, filePath: filepath, type: 'text' }
  }

  return { success: false, error: '剪贴板为空' }
})

// 读取剪贴板文本
ipcMain.handle('clipboard:read', () => {
  return {
    text: clipboard.readText(),
    hasImage: !clipboard.readImage().isEmpty()
  }
})

// ===================== 文件操作 IPC =====================

// 读取目录树
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries.map(e => ({
      id: path.join(dirPath, e.name),
      name: e.name,
      isDir: e.isDirectory(),
      path: path.join(dirPath, e.name),
    }))
  } catch (e: any) {
    return []
  }
})

// 读取文件内容
ipcMain.handle('fs:readFile', async (_, filepath: string) => {
  try {
    return fs.readFileSync(filepath, 'utf-8')
  } catch {
    return ''
  }
})

// 写文件
ipcMain.handle('fs:writeFile', async (_, filepath: string, content: string) => {
  try {
    fs.writeFileSync(filepath, content, 'utf-8')
    return true
  } catch (e: any) {
    return false
  }
})

// 创建文件/文件夹
ipcMain.handle('fs:create', async (_, opts: { parentPath: string, name: string, isDir: boolean }) => {
  try {
    const targetPath = path.join(opts.parentPath, opts.name)
    if (opts.isDir) {
      fs.mkdirSync(targetPath)
    } else {
      fs.writeFileSync(targetPath, `# ${opts.name.replace('.md', '')}\n\n`, 'utf-8')
    }
    return { success: true, path: targetPath }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

// 删除文件/文件夹
ipcMain.handle('fs:delete', async (_, targetPath: string) => {
  try {
    const stat = fs.statSync(targetPath)
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true })
    } else {
      fs.unlinkSync(targetPath)
    }
    return true
  } catch {
    return false
  }
})

// 重命名/移动
ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
  try {
    const newDir = path.dirname(newPath)
    // 确保目标目录存在
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true })
    }
    fs.renameSync(oldPath, newPath)
    return { success: true, newPath }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

// 选择目录
ipcMain.handle('dialog:selectDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// 获取配置
ipcMain.handle('config:get', () => getConfig())

// 设置配置
ipcMain.handle('config:set', (_, cfg: any) => {
  setConfig(cfg)
  // 重新注册快捷键
  if (mainWindow) {
    unregisterShortcuts()
    registerShortcuts(mainWindow)
  }
  return true
})

// 获取默认保存目录
ipcMain.handle('config:getSaveDir', () => {
  const config = getConfig()
  return config.saveDirectory || path.join(app.getPath('documents'), 'ClipNotes')
})

// shell 打开路径
ipcMain.handle('shell:openPath', (_, p: string) => shell.openPath(p))

// 读取图片文件并返回 base64（用于在渲染进程安全显示本地图片）
ipcMain.handle('fs:readImageAsBase64', async (_, imagePath: string) => {
  try {
    const ext = path.extname(imagePath).slice(1).toLowerCase()
    const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' }
    const mimeType = mimeMap[ext] || 'image/png'
    const buffer = fs.readFileSync(imagePath)
    const base64 = buffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch {
    return null
  }
})

// ===================== 生命周期 =====================

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  unregisterShortcuts()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
