import React, { useState, useEffect, useCallback } from 'react'
import { FileTree } from './components/FileTree'
import { Editor } from './components/Editor'
import { AiPanel } from './components/AiPanel'
import { Settings } from './components/Settings'
import { Notification } from './components/Notification'
import { useAppStore } from './store/appStore'

declare global {
  interface Window {
    electronAPI: import('../electron/preload').ElectronAPI
  }
}

type Panel = 'files' | 'settings'

// ============ SVG 图标（全局）============
const IconFiles = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
)

const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const IconAI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

export default function App() {
  const {
    activeFile,
    saveDir,
    rightPanel,
    setRightPanel,
    notification,
    setNotification,
    setSaveDir,
    setConfig,
    handleSaveClipboard,
  } = useAppStore()

  const [leftPanel, setLeftPanel] = useState<Panel>('files')
  const [leftWidth, setLeftWidth] = useState(240)
  const [rightWidth, setRightWidth] = useState(320)

  // 初始化
  useEffect(() => {
    window.electronAPI.config.getSaveDir().then(dir => {
      if (dir) setSaveDir(dir)
    })
    window.electronAPI.config.get().then(cfg => {
      if (cfg) setConfig({
        ollamaHost: cfg.ollamaHost || 'http://localhost:11434',
        aiModel: cfg.aiModel || 'phi3:mini',
        saveDirectory: cfg.saveDirectory || '',
      })
    })
  }, [])

  // ====== 全部快捷键监听 ======
  useEffect(() => {
    const handlers: Record<string, () => void> = {
      'shortcut:save': () => {
        setNotification({ type: 'info', message: '正在保存剪贴板...' })
        handleSaveClipboard()
      },
      'shortcut:explain': () => {
        setRightPanel('ai')
        // 延迟触发，让 AI 面板先渲染完成
        setTimeout(() => {
          setNotification({ type: 'info', message: '请先选中文字，再按 Ctrl+Shift+E' })
        }, 100)
      },
      'shortcut:summarize': () => {
        setRightPanel('ai')
        setTimeout(() => {
          setNotification({ type: 'info', message: '已发送文件总结指令到 AI' })
        }, 100)
      },
      'shortcut:toggle-ai': () => {
        setRightPanel(rightPanel === 'ai' ? null : 'ai')
      },
      'shortcut:new-file': () => {
        setNotification({ type: 'info', message: '请在左侧文件树中右键新建文件 (Ctrl+N)' })
      },
      'shortcut:save-file': () => {
        setNotification({ type: 'info', message: '文件已自动保存 (Ctrl+S)' })
      },
      'shortcut:toggle-preview': () => {
        // 发送到 Editor 组件
        window.dispatchEvent(new CustomEvent('app:toggle-preview'))
      },
      'shortcut:settings': () => {
        setLeftPanel('settings')
      },
      'notification': (_event: any, data: any) => {
        setNotification(data || { type: 'info', message: '' })
      },
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      window.electronAPI.on(event, handler)
    })

    return () => {
      Object.keys(handlers).forEach(event => {
        window.electronAPI.off(event, handlers[event])
      })
    }
  }, [rightPanel])

  // 拖拽调整左侧面板宽度
  const handleLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftWidth
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(180, Math.min(500, startWidth + ev.clientX - startX))
      setLeftWidth(newW)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftWidth])

  // 拖拽调整右侧面板宽度
  const handleRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightWidth
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(250, Math.min(600, startWidth - ev.clientX + startX))
      setRightWidth(newW)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [rightWidth])

  return (
    <div className="app">
      {/* ===== 顶部标题栏 ===== */}
      <header className="title-bar">
        <div className="title-bar-left">
          {/* Logo + 名称 */}
          <span className="logo-mark">C</span>
          <span className="app-title">ClipNote</span>
        </div>

        <div className="title-bar-center">
          <div className="panel-tabs">
            <button
              className={`tab ${leftPanel === 'files' ? 'active' : ''}`}
              onClick={() => setLeftPanel('files')}
              title="文件管理"
            >
              <IconFiles />
            </button>
            <button
              className={`tab ${leftPanel === 'settings' ? 'active' : ''}`}
              onClick={() => setLeftPanel('settings')}
              title="设置"
            >
              <IconSettings />
            </button>
          </div>
        </div>

        <div className="title-bar-right">
          <button
            className={`icon-btn ai-btn ${rightPanel === 'ai' ? 'active' : ''}`}
            onClick={() => setRightPanel(rightPanel === 'ai' ? null : 'ai')}
            title="AI 助手 (Ctrl+Shift+A)"
          >
            <IconAI />
          </button>
        </div>
      </header>

      {/* ===== 主体区域 ===== */}
      <div className="main">
        {/* 左侧 */}
        <div className="left-panel" style={{ width: leftWidth }}>
          {leftPanel === 'files' ? <FileTree /> : <Settings />}
        </div>
        <div className="resize-handle-v" onMouseDown={handleLeftResize} />

        {/* 中间编辑器 */}
        <div className="center-panel">
          {activeFile ? (
            <Editor />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">C</div>
              <h2>ClipNote</h2>
              <p>本地剪贴板 · Markdown 笔记 · AI 助手</p>
              <div className="empty-shortcuts">
                <kbd>Ctrl+Shift+S</kbd> 保存剪贴板
                <kbd>Ctrl+Shift+A</kbd> AI 助手
                <kbd>Ctrl+,</kbd> 设置
              </div>
              <button className="btn-primary" onClick={handleSaveClipboard}>
                保存剪贴板
              </button>
            </div>
          )}
        </div>

        {/* 右侧 AI */}
        {rightPanel === 'ai' && (
          <>
            <div className="resize-handle-v" onMouseDown={handleRightResize} />
            <div className="right-panel" style={{ width: rightWidth }}>
              <AiPanel />
            </div>
          </>
        )}
      </div>

      {/* 通知 */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
