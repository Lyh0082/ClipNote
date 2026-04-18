import { create } from 'zustand'

interface Notification {
  type: 'success' | 'error' | 'info'
  message: string
}

interface FileNode {
  id: string
  name: string
  isDir: boolean
  path: string
  children?: FileNode[]
}

interface AppState {
  // 文件相关
  saveDir: string
  activeFile: string | null
  activeFileContent: string
  activeFileIsImage: boolean
  fileTree: FileNode[]
  fileCache: Record<string, string>
  selectedItem: string | null  // 当前选中的文件或文件夹（用于AI）
  selectedIsDir: boolean | null  // 选中的是否为文件夹

  // AI 相关
  aiMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  aiLoading: boolean
  aiOutput: string

  // 配置
  config: {
    ollamaHost: string
    aiModel: string
    saveDirectory: string
    language: string
  }

  // 面板
  showSettings: boolean
  rightPanel: 'ai' | null
  notification: Notification | null

  // Actions
  setSaveDir: (dir: string) => void
  setActiveFile: (path: string | null) => void
  setActiveFileContent: (content: string) => void
  setFileTree: (tree: FileNode[]) => void
  setRightPanel: (panel: 'ai' | null) => void
  setNotification: (n: Notification | null) => void
  addAiMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void
  setAiLoading: (v: boolean) => void
  setAiOutput: (v: string) => void
  clearAiMessages: () => void
  setConfig: (cfg: Partial<AppState['config']>) => void
  setSelectedItem: (path: string | null, isDir: boolean | null) => void
  setShowSettings: (show: boolean) => void

  // 图片类型检测
  isImageFile: (path: string) => boolean

  // 操作
  openFile: (path: string) => Promise<void>
  saveActiveFile: () => Promise<void>
  handleSaveClipboard: () => Promise<void>
  reloadTree: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  saveDir: '',
  activeFile: null,
  activeFileContent: '',
  fileTree: [],
  fileCache: {},
  aiMessages: [],
  aiLoading: false,
  aiOutput: '',
  rightPanel: null,
  notification: (null as any),
  activeFileIsImage: false,
  config: {
    ollamaHost: 'http://localhost:11434',
    aiModel: 'glm-ocr:q8_0',  // 默认使用本地已安装的 GLM-OCR 模型
    saveDirectory: '',
    language: 'en',
  },

  showSettings: false,
  setSaveDir: (dir) => set({ saveDir: dir }),
  setActiveFile: (path) => set({ activeFile: path }),
  setActiveFileContent: (content) => set({ activeFileContent: content }),
  setFileTree: (tree) => set({ fileTree: tree }),
  selectedItem: null,
  selectedIsDir: null,
  setSelectedItem: (path: string | null, isDir: boolean | null) => set({ selectedItem: path, selectedIsDir: isDir }),
  setRightPanel: (panel) => set({ rightPanel: panel }),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  setNotification: (n) => set({ notification: n }),
  addAiMessage: (msg) => set(state => ({ aiMessages: [...state.aiMessages, msg] })),
  setAiLoading: (v) => set({ aiLoading: v }),
  setAiOutput: (v) => set({ aiOutput: v }),
  clearAiMessages: () => set({ aiMessages: [] }),
  setConfig: (cfg) => set(state => ({ config: { ...state.config, ...cfg } })),

  isImageFile: (path) => {
    const ext = (path.toLowerCase().split('.').pop() || '')
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
  },

  openFile: async (path) => {
    // 图片文件：转为 file:// URL 直接预览
    if (get().isImageFile(path)) {
      const fileUrl = `file:///${path.replace(/\\/g, '/')}`
      set({ activeFile: path, activeFileContent: fileUrl, activeFileIsImage: true })
      return
    }

    const cache = get().fileCache
    if (cache[path]) {
      set({ activeFile: path, activeFileContent: cache[path], activeFileIsImage: false })
      return
    }
    const content = await window.electronAPI.fs.readFile(path)
    set(state => ({
      activeFile: path,
      activeFileContent: content,
      activeFileIsImage: false,
      fileCache: { ...state.fileCache, [path]: content }
    }))
  },

  saveActiveFile: async () => {
    const { activeFile, activeFileContent } = get()
    if (!activeFile) return
    await window.electronAPI.fs.writeFile(activeFile, activeFileContent)
    set(state => ({
      fileCache: { ...state.fileCache, [activeFile]: activeFileContent }
    }))
    get().setNotification({ type: 'success', message: '文件已保存' })
  },

  handleSaveClipboard: async () => {
    set({ notification: { type: 'info', message: '正在保存剪贴板...' } })
    const result = await window.electronAPI.clipboard.save()
    if (result.success) {
      set({ notification: { type: 'success', message: `已保存到: ${result.filePath}` } })
      get().reloadTree()
      get().openFile(result.filePath!)
    } else {
      set({ notification: { type: 'error', message: result.error || '保存失败' } })
    }
  },

  reloadTree: async () => {
    const { saveDir } = get()
    if (!saveDir) return
    const nodes = await window.electronAPI.fs.readDir(saveDir)
    const tree = await buildTree(saveDir)
    set({ fileTree: tree })
  },
}))

async function buildTree(dirPath: string): Promise<FileNode[]> {
  try {
    const entries = await window.electronAPI.fs.readDir(dirPath)
    const result: FileNode[] = []

    for (const entry of entries) {
      if (entry.isDir) {
        const children = await buildTree(entry.path)
        result.push({ ...entry, children })
      } else {
        result.push(entry)
      }
    }

    // 排序：文件夹在前，文件在后，名称排序
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return result
  } catch {
    return []
  }
}
