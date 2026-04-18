import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  // 剪贴板
  clipboard: {
    save: () => Promise<{ success: boolean; filePath?: string; type?: string; error?: string }>
    read: () => Promise<{ text: string; hasImage: boolean }>
  }
  // 文件系统
  fs: {
    readDir: (path: string) => Promise<Array<{ id: string; name: string; isDir: boolean; path: string }>>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<boolean>
    create: (opts: { parentPath: string; name: string; isDir: boolean }) => Promise<{ success: boolean; path?: string; error?: string }>
    delete: (path: string) => Promise<boolean>
    rename: (oldPath: string, newName: string) => Promise<{ success: boolean; newPath?: string; error?: string }>
    readImageAsBase64: (imagePath: string) => Promise<string | null>
  }
  // 对话框
  dialog: {
    selectDir: () => Promise<string | null>
  }
  // 配置
  config: {
    get: () => Promise<any>
    set: (cfg: any) => Promise<boolean>
    getSaveDir: () => Promise<string>
  }
  // shell
  shell: {
    openPath: (path: string) => Promise<string>
  }
  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

const api: ElectronAPI = {
  clipboard: {
    save: () => ipcRenderer.invoke('clipboard:save'),
    read: () => ipcRenderer.invoke('clipboard:read'),
  },
  fs: {
    readDir: (p) => ipcRenderer.invoke('fs:readDir', p),
    readFile: (p) => ipcRenderer.invoke('fs:readFile', p),
    writeFile: (p, c) => ipcRenderer.invoke('fs:writeFile', p, c),
    create: (o) => ipcRenderer.invoke('fs:create', o),
    delete: (p) => ipcRenderer.invoke('fs:delete', p),
    rename: (oldPath, newName) => ipcRenderer.invoke('fs:rename', oldPath, newName),
    readImageAsBase64: (imagePath) => ipcRenderer.invoke('fs:readImageAsBase64', imagePath),
  },
  dialog: {
    selectDir: () => ipcRenderer.invoke('dialog:selectDir'),
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (cfg) => ipcRenderer.invoke('config:set', cfg),
    getSaveDir: () => ipcRenderer.invoke('config:getSaveDir'),
  },
  shell: {
    openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  },
  on: (channel, callback) => {
    const validChannels = ['clipboard:saved', 'ai:explain', 'shortcut:save', 'shortcut:explain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
