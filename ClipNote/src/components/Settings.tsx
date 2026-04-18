import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { checkOllamaStatus } from '../utils/ollama'

// ============ 极简图标 ============
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
)

const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
)

const IconKeyboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/>
    <line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/>
    <line x1="8" y1="14" x2="16" y2="14"/>
  </svg>
)

const IconBot = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 014 4v1h1a3 3 0 013 3v3a3 3 0 01-3 3H8a3 3 0 01-3-3v-3a3 3 0 013-3h1V6a4 4 0 014-4z"/>
    <circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/>
    <path d="M9 17h6"/>
  </svg>
)

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// Tooltip 组件
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="tip-wrap" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && <div className="tip-badge">{text}</div>}
    </div>
  )
}

export function Settings() {
  const { saveDir, setSaveDir, config: storeConfig } = useAppStore()
  
  const [saveDirVal, setSaveDirVal] = useState(storeConfig?.saveDirectory || saveDir || '')
  const [shortcuts, setShortcuts] = useState({
    saveClipboard: storeConfig?.shortcuts?.saveClipboard || 'CommandOrControl+Shift+S',
    explainWord: storeConfig?.shortcuts?.explainWord || 'CommandOrControl+Shift+E',
  })
  const [aiModel, setAiModel] = useState(storeConfig?.aiModel || 'glm-ocr:q8_0')
  const [ollamaHost, setOllamaHost] = useState(storeConfig?.ollamaHost || 'http://localhost:11434')
  const [fontSize, setFontSize] = useState(storeConfig?.fontSize || 14)
  const [language, setLanguage] = useState(storeConfig?.language || 'en')
  const [customModelInput, setCustomModelInput] = useState('')
  
  const [ollamaStatus, setOllamaStatus] = useState({ connected: false, models: [] as string[] })
  const [recordingKey, setRecordingKey] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadConfig()
    checkOllama()
  }, [])

  const loadConfig = async () => {
    try {
      const cfg = await window.electronAPI.config.get()
      setSaveDirVal(cfg.saveDirectory || saveDir || '')
      setShortcuts(cfg.shortcuts || shortcuts)
      setAiModel(cfg.aiModel || 'glm-ocr:q8_0')
      setOllamaHost(cfg.ollamaHost || 'http://localhost:11434')
      setFontSize(cfg.fontSize || 14)
      setLanguage(cfg.language || 'en')
    } catch (e) {}
  }

  const checkOllama = async () => {
    setChecking(true)
    const status = await checkOllamaStatus(ollamaHost)
    setOllamaStatus(status)
    setChecking(false)
  }

  // 添加自定义模型（用户输入模型名）
  const handleAddModel = () => {
    const name = customModelInput.trim()
    if (name && !ollamaStatus.models.includes(name)) {
      setAiModel(name)
      setCustomModelInput('')
    }
  }

  const handleSelectDir = async () => {
    const dir = await window.electronAPI.dialog.selectDir()
    if (dir) {
      setSaveDirVal(dir)
      setSaveDir(dir)
    }
  }

  const handleSave = async () => {
    const cfg = { saveDirectory: saveDirVal, shortcuts, aiModel, ollamaHost, fontSize, language }
    await window.electronAPI.config.set(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleKeyDown = (key: 'saveClipboard' | 'explainWord') => (e: React.KeyboardEvent) => {
    e.preventDefault()
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    const k = e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(k)) {
      parts.push(k.length === 1 ? k.toUpperCase() : k)
    }
    if (parts.length > 1) {
      setShortcuts(s => ({ ...s, [key]: parts.join('+') }))
      setRecordingKey(null)
    }
  }

  // 模型选择：显示已安装 + 支持用户输入自定义
  const allModels = [...new Set([...ollamaStatus.models, aiModel])]

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ]

  return (
    <div className="settings">
      {/* 头部 */}
      <div className="settings-header">
        <span className="settings-title"><IconSettings /> Settings</span>
        <button className="settings-close" onClick={() => useAppStore.getState().setShowSettings(false)}>
          <IconX />
        </button>
      </div>

      <div className="settings-body">
        {/* Section: Path */}
        <div className="settings-section">
          <div className="settings-row">
            <Tip text="Save Path"><IconFolder /></Tip>
            <input
              className="setting-input"
              value={saveDirVal}
              onChange={e => setSaveDirVal(e.target.value)}
            />
            <button className="icon-btn" onClick={handleSelectDir}>📂</button>
          </div>
        </div>

        {/* Section: Shortcuts */}
        <div className="settings-section">
          <div className="section-label"><IconKeyboard /> Shortcuts</div>
          
          <div className="settings-row">
            <Tip text="Save Clipboard"><span className="key-label">⌘S</span></Tip>
            <div
              className={`shortcut-input ${recordingKey === 'saveClipboard' ? 'recording' : ''}`}
              tabIndex={0}
              onFocus={() => setRecordingKey('saveClipboard')}
              onBlur={() => setRecordingKey(null)}
              onKeyDown={handleKeyDown('saveClipboard')}
            >
              {recordingKey === 'saveClipboard' ? '...' : shortcuts.saveClipboard}
            </div>
          </div>
          
          <div className="settings-row">
            <Tip text="Explain Selection"><span className="key-label">⌘E</span></Tip>
            <div
              className={`shortcut-input ${recordingKey === 'explainWord' ? 'recording' : ''}`}
              tabIndex={0}
              onFocus={() => setRecordingKey('explainWord')}
              onBlur={() => setRecordingKey(null)}
              onKeyDown={handleKeyDown('explainWord')}
            >
              {recordingKey === 'explainWord' ? '...' : shortcuts.explainWord}
            </div>
          </div>
        </div>

        {/* Section: AI */}
        <div className="settings-section">
          <div className="section-label"><IconBot /> AI</div>
          
          <div className="settings-row">
            <Tip text="Ollama Host"><IconGlobe /></Tip>
            <input
              className="setting-input"
              value={ollamaHost}
              onChange={e => setOllamaHost(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <button className="icon-btn small" onClick={checkOllama} disabled={checking}>
              <IconRefresh />
            </button>
          </div>
          
          {/* 连接状态 */}
          <div className="status-row">
            {ollamaStatus.connected ? (
              <span className="status-ok"><IconCheck /> Connected · {ollamaStatus.models.length} models</span>
            ) : (
              <span className="status-err"><IconX /> Disconnected</span>
            )}
          </div>

          <div className="settings-row">
            <Tip text="Model"><IconBot /></Tip>
            <select
              className="setting-select"
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
            >
              {ollamaStatus.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 自定义模型输入 */}
          <div className="settings-row">
            <input
              className="setting-input"
              value={customModelInput}
              onChange={e => setCustomModelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddModel()}
              placeholder="Type model name to add..."
            />
            <button
              className="icon-btn small"
              onClick={handleAddModel}
              disabled={!customModelInput.trim()}
            >+</button>
          </div>
        </div>

        {/* Section: Language */}
        <div className="settings-section">
          <div className="section-label"><IconGlobe /> Language</div>
          <div className="settings-row">
            <Tip text="Interface Language"><IconGlobe /></Tip>
            <select
              className="setting-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              {languageOptions.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section: Appearance */}
        <div className="settings-section">
          <div className="section-label"><IconEye /> Appearance</div>
          <div className="settings-row">
            <Tip text="Font Size"><span className="row-icon">Aa</span></Tip>
            <input
              type="number"
              className="setting-input small"
              value={fontSize}
              min={12} max={24}
              onChange={e => setFontSize(Number(e.target.value))}
            />
            <span className="unit-label">px</span>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="settings-footer">
        <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
          {saved ? <><IconCheck /> Saved</> : <><IconSave /> Save</>}
        </button>
      </div>

      {/* 样式 */}
      <style>{`
        .settings {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg2);
          color: var(--text);
          font-size: 13px;
        }
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-light);
          background: var(--bg);
        }
        .settings-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .settings-close {
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: all 0.15s;
        }
        .settings-close:hover { color: var(--text); background: rgba(255,255,255,0.06); }
        .settings-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }
        .settings-section {
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .section-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }
        .settings-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .settings-row:last-child { margin-bottom: 0; }
        .setting-input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
          padding: 6px 10px;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .setting-input:focus { border-color: var(--accent); }
        .setting-input.small { width: 60px; flex: none; }
        .setting-select {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
          padding: 6px 10px;
          outline: none;
          cursor: pointer;
          font-family: inherit;
        }
        .setting-select:focus { border-color: var(--accent); }
        .shortcut-input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          color: var(--text-dim);
          font-size: 11px;
          padding: 6px 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'SF Mono', 'Cascadia Code', monospace;
        }
        .shortcut-input:hover { border-color: var(--accent); color: var(--text); }
        .shortcut-input.recording { border-color: #f59e0b; color: #f59e0b; animation: pulse-border 1s infinite; }
        @keyframes pulse-border { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .icon-btn {
          background: none;
          border: 1px solid var(--border-light);
          color: var(--text-dim);
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.15s;
          font-size: 12px;
        }
        .icon-btn:hover { border-color: var(--accent); color: var(--accent); }
        .icon-btn.small { padding: 4px 6px; }
        .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .row-icon, .key-label {
          width: 24px;
          text-align: center;
          font-size: 12px;
          color: var(--text-dim);
          flex-shrink: 0;
        }
        .key-label { font-family: monospace; font-size: 11px; }
        .unit-label { font-size: 11px; color: var(--text-dim); }
        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }
        .status-text { font-size: 11px; color: var(--text-dim); }
        .status-ok, .status-err {
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .status-ok { color: #4ade80; }
        .status-err { color: #f87171; }
        .settings-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border-light);
        }
        .save-btn {
          width: 100%;
          padding: 9px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .save-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .save-btn.saved { background: #4ade80; }
        /* Tooltip */
        .tip-wrap { position: relative; display: flex; align-items: center; }
        .tip-badge {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #1e1e2e;
          color: var(--text);
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 5px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
          border: 1px solid var(--border-light);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  )
}
