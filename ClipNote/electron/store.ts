import Store from 'electron-store'
import { app } from 'electron'
import * as path from 'path'
import * as os from 'os'

interface Config {
  saveDirectory: string
  shortcuts: {
    saveClipboard: string
    explainWord: string
  }
  aiModel: string
  ollamaHost: string
  theme: 'dark' | 'light'
  fontSize: number
  windowWidth: number
  windowHeight: number
  sidebarWidth: number
}

const defaults: Config = {
  saveDirectory: path.join(app.getPath('documents'), 'ClipNotes'),
  shortcuts: {
    saveClipboard: 'CommandOrControl+Shift+S',
    explainWord: 'CommandOrControl+Shift+E',
  },
  aiModel: 'phi3:mini',
  ollamaHost: 'http://localhost:11434',
  theme: 'dark',
  fontSize: 14,
  windowWidth: 1300,
  windowHeight: 800,
  sidebarWidth: 240,
}

let configStore: Store<Config>

function getStore(): Store<Config> {
  if (!configStore) {
    configStore = new Store<Config>({
      name: 'clipnote-config',
      defaults,
    })
  }
  return configStore
}

export function getConfig(): Config {
  return getStore().store
}

export function setConfig(partial: Partial<Config>): void {
  const current = getConfig()
  getStore().set({ ...current, ...partial })
}
