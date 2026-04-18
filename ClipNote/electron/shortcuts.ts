import { globalShortcut, ipcMain, BrowserWindow } from 'electron'
import { getConfig, setConfig } from './store'

/**
 * 快捷键系统
 * 
 * 所有操作都支持快捷键，默认值可在设置中修改
 */

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: Record<string, string> = {
  saveClipboard: 'CommandOrControl+Shift+S',
  explainWord: 'CommandOrControl+Shift+E',
  summarizeFile: 'CommandOrControl+Shift+D',
  toggleAiPanel: 'CommandOrControl+Shift+A',
  newFile: 'CommandOrControl+N',
  saveFile: 'CommandOrControl+S',
  togglePreview: 'CommandOrControl+E',
  openSettings: 'CommandOrControl+,',
}

// 快捷键描述（用于 UI 展示）
export const SHORTCUT_DESCRIPTIONS: Record<string, string> = {
  saveClipboard: '保存剪贴板',
  explainWord: '划词解释',
  summarizeFile: '文件总结',
  toggleAiPanel: '切换 AI 面板',
  newFile: '新建文件',
  saveFile: '保存文件',
  togglePreview: '切换预览',
  openSettings: '打开设置',
}

let currentWindow: BrowserWindow | null = null

/**
 * 注册所有快捷键
 */
export function registerShortcuts(mainWindow: BrowserWindow) {
  const config = getConfig()
  const shortcuts = config.shortcuts || DEFAULT_SHORTCUTS
  
  // 先注销所有
  unregisterShortcuts()
  
  currentWindow = mainWindow

  // 注册每个快捷键
  Object.entries(shortcuts).forEach(([action, accelerator]) => {
    if (!accelerator) return
    
    try {
      const registered = globalShortcut.register(accelerator, () => {
        handleAction(action, mainWindow)
      })
      
      if (registered) {
        console.log(`[Shortcut] ✅ ${accelerator} → ${SHORTCUT_DESCRIPTIONS[action] || action}`)
      } else {
        console.log(`[Shortcut] ❌ ${accelerator} → ${SHORTCUT_DESCRIPTIONS[action] || action} (注册失败，可能被占用)`)
      }
    } catch (err) {
      console.error(`[Shortcut] 注册失败 "${accelerator}":`, err)
    }
  })
}

/**
 * 处理快捷键动作
 */
function handleAction(action: string, win: BrowserWindow) {
  if (!win || win.isDestroyed()) return
  
  switch (action) {
    case 'saveClipboard':
      win.webContents.send('shortcut:save')
      break
      
    case 'explainWord':
      win.webContents.send('shortcut:explain')
      break
      
    case 'summarizeFile':
      win.webContents.send('shortcut:summarize')
      break
      
    case 'toggleAiPanel':
      win.webContents.send('shortcut:toggle-ai')
      break
      
    case 'newFile':
      win.webContents.send('shortcut:new-file')
      break
      
    case 'saveFile':
      win.webContents.send('shortcut:save-file')
      break
      
    case 'togglePreview':
      win.webContents.send('shortcut:toggle-preview')
      break
      
    case 'openSettings':
      win.webContents.send('shortcut:settings')
      break
      
    default:
      console.warn(`[Shortcut] 未知动作:`, action)
  }
}

/**
 * 注销所有快捷键
 */
export function unregisterShortcuts() {
  globalShortcut.unregisterAll()
}

/**
 * 更新单个快捷键（热更新）
 */
export function updateShortcut(action: string, accelerator: string) {
  const config = getConfig()
  
  if (!config.shortcuts) config.shortcuts = {}
  
  // 先注销旧的
  const oldAccel = config.shortcuts[action]
  if (oldAccel) {
    try { globalShortcut.unregister(oldAccel) } catch {}
  }
  
  // 设置新的
  config.shortcuts[action] = accelerator
  setConfig(config as any)
  
  // 重新注册
  if (currentWindow && !currentWindow.isDestroyed()) {
    try {
      const ok = globalShortcut.register(accelerator, () => {
        handleAction(action, currentWindow!)
      })
      console.log(`[Shortcut] 更新 ${action}: ${oldAccel} → ${accelerator} (${ok ? '✅' : '❌'})`)
      currentWindow.webContents.send('shortcut:updated', { action, accelerator, success: ok })
    } catch (err) {
      console.error(`[Shortcut] 更新失败:`, err)
    }
  }
}
