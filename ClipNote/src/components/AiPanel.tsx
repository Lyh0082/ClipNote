/**
 * AI 面板组件
 * 
 * 修复：
 * 1. 系统提示词不再混入用户消息（通过 Ollama system 字段发送）
 * 2. 加载状态清晰显示（骨架屏 + 动画）
 * 3. 自由对话/基于文件模式完全独立
 * 4. 简约图标 + 悬浮提示
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { callOllama, checkOllamaStatus, createClipNoteModel } from '../utils/ollama'

// 获取 electronAPI（带类型声明）
declare global {
  interface Window {
    electronAPI?: {
      fs: {
        readImageAsBase64: (imagePath: string) => Promise<string | null>
      }
    }
  }
}

/**
 * 处理 Markdown 内容中的图片，将相对路径转换为 base64
 * 这样 AI 就能"看到"图片内容
 */
async function processMarkdownWithImages(content: string, filePath: string): Promise<string> {
  if (!content || !filePath) return content
  
  // 解析文件所在目录，用于拼接相对路径
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  const baseDir = lastSep > 0 ? filePath.substring(0, lastSep) : ''
  
  // 匹配 Markdown 图片语法：![alt](path)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const matches = [...content.matchAll(imageRegex)]
  
  console.log('[processMarkdown] Found', matches.length, 'images in', filePath)
  if (matches.length === 0) return content
  
  let processed = content
  
  for (const match of matches) {
    const [fullMatch, alt, imagePath] = match
    if (imagePath.startsWith('data:') || imagePath.startsWith('http')) {
      console.log('[processMarkdown] Skip already-processed:', imagePath.slice(0, 30))
      continue
    }
    
    try {
      // 解析相对路径为绝对路径
      let absolutePath = imagePath
      if (!imagePath.startsWith('/') && !imagePath.match(/^[A-Za-z]:/)) {
        // 相对路径，拼接 baseDir
        absolutePath = `${baseDir}/${imagePath}`.replace(/\\/g, '/')
      }
      console.log('[processMarkdown] Reading image:', absolutePath)
      
      const base64 = await window.electronAPI?.fs.readImageAsBase64(absolutePath)
      if (base64) {
        console.log('[processMarkdown] Got base64, len=', base64.length)
        processed = processed.replace(fullMatch, `![${alt}](${base64})`)
      } else {
        console.warn('[processMarkdown] readImageAsBase64 returned null for:', absolutePath)
      }
    } catch (e) {
      console.warn('[AI] 无法处理图片:', imagePath, e)
    }
  }
  
  return processed
}

// ============ SVG 图标 ============
const IconChat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/>
  </svg>
)

const IconFolder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
)

const IconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

const IconBulb = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"/><path d="M10 22h4"/>
    <path d="M12 2a7 7 0 016.95 6.15c.25.9.33 1.85.05 2.73a7 7 0 01-4 4.32c-.35.13-.72.23-1 .3v1.5H10v-1.5a6.98 6.98 0 01-5-6.34A7 7 0 0112 2z"/>
  </svg>
)

const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16l4-4h10a2 2 0 002-2V4a2 2 0 00-2-2z"/>
  </svg>
)

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
)

const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
)

const IconSparkle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ============ 骨架屏（加载动画）============
function LoadingDots() {
  return (
    <div className="ai-loading-dots">
      <span /><span /><span />
      <style>{`
        .ai-loading-dots { display: flex; gap: 4px; padding: 12px; }
        .ai-loading-dots span {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent);
          animation: dot-pulse 1.4s ease-in-out infinite;
        }
        .ai-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .ai-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function AiPanel() {
  const { aiMessages, aiLoading, addAiMessage, setAiLoading, clearAiMessages, activeFile, activeFileContent, setNotification, config, selectedItem, selectedIsDir, fileTree } = useAppStore()
  
  // 模式状态：file 模式同时支持「当前文件」和「选中文件夹」
  const [mode, setMode] = useState<'free' | 'file'>(null!)
  const [streamingText, setStreamingText] = useState('')
  const [input, setInput] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [showInit, setShowInit] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, streamingText])

  // 初始化：检查 Ollama 连接
  useEffect(() => {
    const host = config.ollamaHost || 'http://localhost:11434'
    checkOllamaStatus(host).then(status => {
      setModelReady(status.connected)
      console.log('[Ollama]', status.connected ? `已连接 ${config.aiModel}` : '连接失败，请检查 Ollama 是否运行')
    })
  }, [config.ollamaHost, config.aiModel])

  // 停止生成
  const stopGenerate = useCallback(() => {
    abortRef.current?.abort()
    setAiLoading(false)
    setStreamingText('')
  }, [setAiLoading])

  // 一键复制 AI 回复
  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }).catch(() => {
      setNotification({ type: 'error', message: '复制失败，请手动选择文字' })
    })
  }, [setNotification])

  // ========== 核心：调用 Ollama ==========
  const callAI = useCallback(async (options: {
    prompt?: string
    messages?: typeof aiMessages
    systemPrompt: string
  }) => {
    setAiLoading(true)
    setStreamingText('')
    setShowInit(false)
    
    abortRef.current = new AbortController()

    let fullResponse = ''

    try {
      await callOllama({
        ...(options.prompt ? { prompt: options.prompt } : {}),
        ...(options.messages ? { messages: options.messages } : {}),
        systemPrompt: options.systemPrompt,
        host: config.ollamaHost,
        model: config.aiModel,
        temperature: 0.1,
        onChunk: (chunk) => {
          fullResponse = chunk
          setStreamingText(fullResponse)
        },
        signal: abortRef.current!.signal,
      })

      return fullResponse || null
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[AI] 调用失败:', err)
        setNotification({ type: 'error', message: `AI 错误: ${err.message}` })
      }
      return null
    } finally {
      // 必须先确保 fullResponse 已记录，再清空流式状态
      setAiLoading(false)
      setStreamingText('')
    }
  }, [config.ollamaHost, config.aiModel, setAiLoading, setNotification])

  // ====== 发送消息（自由对话）======
  const handleSendFree = useCallback(async (text: string) => {
    const userMsg = { role: 'user' as const, content: text }
    addAiMessage(userMsg)
    
    // getState 获取最新消息（含刚加的 userMsg）
    // 只取最近 2 轮历史，避免上下文过长导致模型偏离
    const currentMessages = useAppStore.getState().aiMessages
    const recentMessages = currentMessages.length > 3 
      ? [...currentMessages.slice(0, -2), ...currentMessages.slice(-2)]
      : currentMessages
    
    const result = await callAI({
      messages: recentMessages,
      systemPrompt: '你是 ClipNote 本地知识管理助手。回答必须简洁、准确、基于事实。禁止编造信息。每句话不超过20字。',
    })
    
    // callAI 返回后立即添加（此时 streamingText 已在 finally 里清空）
    if (result) {
      addAiMessage({ role: 'assistant', content: result })
    }
  }, [addAiMessage, callAI])

  // ====== 发送消息（基于文件 / 基于文件夹，统一处理）======
  const handleSendFile = useCallback(async (text: string) => {
    const state = useAppStore.getState()
    const currentSelectedItem = state.selectedItem
    const isDir = state.selectedIsDir
    const currentFile = state.activeFile
    const currentContent = state.activeFileContent

    // 优先使用「选中文件夹」，其次是「当前打开的文件」
    if (isDir === true && currentSelectedItem) {
      // ——— 文件夹模式 ———
      const userMsg = { role: 'user' as const, content: text }
      addAiMessage(userMsg)

      try {
        const entries = await window.electronAPI.fs.readDir(currentSelectedItem)
        console.log('[handleSendFile] Folder entries:', entries.length, 'items')
        console.log('[handleSendFile] Entries:', entries.map((e: any) => ({ name: e.name, isDir: e.isDir })))
        const mdFiles = entries.filter((e: any) => !e.isDir && e.name.toLowerCase().endsWith('.md'))
        console.log('[handleSendFile] Filtered mdFiles:', mdFiles.length, mdFiles.map((f: any) => f.name))

        let folderContent = ''
        for (const file of mdFiles.slice(0, 10)) {
          try {
            const content = await window.electronAPI.fs.readFile(file.path)
            console.log('[handleSendFile] Read file:', file.name, 'content len:', content.length)
            folderContent += `\n\n## ${file.name}\n${content.slice(0, 1500)}`
          } catch (e) {
            console.error('[handleSendFile] Read file failed:', file.path, e)
          }
        }
        console.log('[handleSendFile] Total folderContent len:', folderContent.length)

        if (!folderContent) {
          setNotification({ type: 'info', message: '文件夹中没有找到 .md 文件' })
          return
        }

        const folderName = currentSelectedItem.split(/[/\\]/).pop() || '未知文件夹'
        const result = await callAI({
          messages: [{ role: 'user', content: `【文件夹】${folderName}${folderContent}\n\n【问题】${text}` }],
          systemPrompt: '你是知识库分析助手。基于提供的文件夹中所有文件内容回答，不要编造。回答简洁、准确。',
        })

        if (result) {
          addAiMessage({ role: 'assistant', content: result })
        }
      } catch (err) {
        console.error('[AI] 文件夹读取失败:', err)
        setNotification({ type: 'error', message: '读取文件夹内容失败' })
      }
    } else {
      // ——— 文件模式 ———
      if (!currentContent) {
        setNotification({ type: 'info', message: '请先打开一个文件，或在文件树中选中一个文件夹' })
        return
      }

      const userMsg = { role: 'user' as const, content: text }
      addAiMessage(userMsg)

      // 将 Markdown 中的图片转为 base64，让 AI 能"看到"图片
      const fileName = (currentFile || '').split(/[/\\]/).pop() || '未知文件'

      // 将 Markdown 中的图片转为 base64，让 AI 能"看到"图片
      // 策略：收集所有 data:image base64，移除图片语法，纯文本发给 AI
      let processedContent = currentContent
      const imageBase64List: string[] = []

      if (currentFile) {
        processedContent = await processMarkdownWithImages(currentContent, currentFile)
      }

      // 提取所有 data:image/...;base64,xxx 并收集，然后从文本中移除图片语法
      const base64Regex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g
      let match
      while ((match = base64Regex.exec(processedContent)) !== null) {
        imageBase64List.push(match[2])
      }
      console.log('[handleSendFile] Extracted', imageBase64List.length, 'images, first one starts:', imageBase64List[0]?.slice(0, 30))
      // 移除图片语法，只留文本
      const textOnly = processedContent.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim()

      const result = await callAI({
        messages: [{
          role: 'user',
          content: textOnly.slice(0, 2000),
          images: imageBase64List.length > 0 ? imageBase64List : undefined,
        }],
        systemPrompt: '你是文档分析助手。仅基于提供的文件内容（含图片）回答，不添加外部知识。回答简洁、准确。',
      })

      if (result) {
        addAiMessage({ role: 'assistant', content: result })
      }
    }
  }, [addAiMessage, callAI, setNotification])

  // 统一发送处理
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || aiLoading) return
    
    const text = input.trim()
    setInput('')
    
    if (mode === 'free') {
      handleSendFree(text)
    } else if (mode === 'file') {
      handleSendFile(text)
    }
  }, [input, aiLoading, mode, handleSendFree, handleSendFile])

  // 划词解释
  const handleExplain = useCallback(async () => {
    const selection = window.getSelection()?.toString().trim()
    if (!selection) {
      setNotification({ type: 'info', message: '请先选中要解释的文字' })
      return
    }

    setMode('free')
    setShowInit(true)
    
    const userMsg = { role: 'user' as const, content: `解释："${selection}"` }
    addAiMessage(userMsg)
    
    const result = await callAI({
      messages: [userMsg],
      systemPrompt: '用一句话（不超过30字）解释该词语或概念的本质。直接给答案，不要任何前缀或解释。',
    })
    
    if (result) {
      addAiMessage({ role: 'assistant', content: result })
    }
  }, [addAiMessage, callAI, setNotification])

  // 文件总结
  const handleSummarize = useCallback(async () => {
    const currentFile = useAppStore.getState().activeFile
    const currentContent = useAppStore.getState().activeFileContent
    
    if (!currentContent) {
      setNotification({ type: 'info', message: '请先打开一个文件' })
      return
    }

    setMode('file')
    setShowInit(true)
    
    addAiMessage({ role: 'user', content: `📄 总结当前文件内容` })
    
    // 处理图片：将相对路径图片转为 base64
    const fileName = (currentFile || '').split(/[/\\]/).pop() || '未知文件'
    let processedContent = currentContent
    const imageBase64List: string[] = []

    if (currentFile) {
      processedContent = await processMarkdownWithImages(currentContent, currentFile)
    }

    // 提取 data:image base64
    const base64Regex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g
    let match
    while ((match = base64Regex.exec(processedContent)) !== null) {
      imageBase64List.push(match[2])
    }
    // 移除图片语法，只留文本
    const textOnly = processedContent.replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim()
    
    const result = await callAI({
      messages: [{
        role: 'user',
        content: `总结以下文档：\n\n文件名：${fileName}\n\n${textOnly.slice(0, 2000)}`,
        images: imageBase64List.length > 0 ? imageBase64List : undefined,
      }],
      systemPrompt: '严格按以下格式总结：\n\n## 核心摘要\n（1-2句）\n\n## 要点列表\n- 要点1\n- 要点2\n- 要点3\n\n## 延伸思考\n（可选）',
    })
    
    if (result) {
      addAiMessage({ role: 'assistant', content: result })
    }
  }, [addAiMessage, callAI, setNotification])

  // 未选择模式时的初始界面
  if (!mode) {
    return (
      <div className="ai-panel">
        {/* 头部工具栏 */}
        <div className="ai-header-bar">
          <div className="ai-logo"><IconSparkle /></div>
          
          <div className="ai-tool-group">
            <button className="ai-icon-btn" onClick={handleExplain} title="划词解释">
              <IconBulb />
            </button>
            <button className="ai-icon-btn" onClick={handleSummarize} title="文件总结">
              <IconDoc />
            </button>
            {aiMessages.length > 0 && (
              <button className="ai-icon-btn danger" onClick={clearAiMessages} title="清空对话">
                <IconTrash />
              </button>
            )}
          </div>
        </div>

        {/* 模式选择 */}
        <div className="ai-mode-select">
          <p className="mode-label">选择对话模式</p>
          
          <button className="mode-card" onClick={() => setMode('free')}>
            <IconChat />
            <span>自由对话</span>
            <small>提问任意话题</small>
          </button>

          {/* 合并「基于文件」和「基于文件夹」 */}
          {(() => {
            const hasFolder = selectedIsDir === true && selectedItem
            const hasFile = !!activeFileContent
            const enabled = hasFolder || hasFile
            let subLabel = ''
            if (hasFolder) {
              subLabel = `📁 ${selectedItem!.split(/[/\\]/).pop()}`
            } else if (hasFile) {
              subLabel = `📄 ${(activeFile || '').split(/[/\\]/).pop()}`
            } else {
              subLabel = '打开文件或选中文件夹'
            }
            return (
              <button
                className={`mode-card ${!enabled ? 'disabled' : ''}`}
                onClick={() => enabled && setMode('file')}
                disabled={!enabled}
              >
                {hasFolder ? <IconFolder /> : <IconFile />}
                <span>基于文件提问</span>
                <small>{subLabel}</small>
              </button>
            )
          })()}

          {!modelReady && (
            <p className="model-hint">正在初始化模型配置...</p>
          )}
          {modelReady && (
            <p className="model-hint">{config.aiModel} · local</p>
          )}
        </div>
      </div>
    )
  }

  // 已选择模式后的界面
  return (
    <div className="ai-panel">
      {/* 头部 */}
      <div className="ai-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="back-btn" onClick={() => setMode(null!)}>
            ←
          </button>
          <span className="ai-title">{mode === 'free' ? '自由对话' : '基于文件提问'}</span>
        </div>
        
        <div className="ai-tool-group">
          <button className="ai-icon-btn" onClick={handleExplain} title="划词解释">
            <IconBulb />
          </button>
          <button className="ai-icon-btn" onClick={handleSummarize} title="文件总结">
            <IconDoc />
          </button>
          <button className="ai-icon-btn danger" onClick={clearAiMessages} title="清空对话">
            <IconTrash />
          </button>
        </div>
      </div>

      {/* 文件/文件夹提示（基于文件提问模式） */}
      {mode === 'file' && (
        <div className="ai-file-tag">
          {selectedIsDir === true && selectedItem
            ? `📁 ${selectedItem.split(/[/\\]/).pop()}`
            : activeFile
              ? `📄 ${activeFile.split(/[/\\]/).pop()}`
              : null
          }
        </div>
      )}

      {/* 消息区域 */}
      <div className="ai-messages">
        {/* 初始化中 */}
        {showInit && !streamingText && (
          <div className="ai-msg ai-msg-system"><LoadingDots /> 正在思考...</div>
        )}

        {(!showInit || aiMessages.length > 0) && aiMessages.length === 0 && !streamingText && (
          <div className="ai-welcome">
            <p>{mode === 'free' ? '💬 有什么想问的？' : (selectedIsDir === true ? '📁 关于这个文件夹，你想了解什么？' : '📄 关于这个文件，你想了解什么？')}</p>
          </div>
        )}

        {/* 消息列表 */}
        {aiMessages.map((msg, i) => (
          <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
            <div className="ai-msg-avatar">{msg.role === 'user' ? '●' : '◉'}</div>
            <div className="ai-msg-content">
              <div className="ai-msg-text markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              {msg.role === 'assistant' && (
                <button
                  className={`ai-copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                  onClick={() => handleCopy(msg.content, i)}
                  title={copiedIndex === i ? '已复制' : '复制'}
                >
                  {copiedIndex === i ? <IconCheck /> : <IconCopy />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* 流式输出 + 加载指示器 */}
        {(streamingText || (showInit && aiMessages.length > 0)) && (
          <div className="ai-msg ai-msg-assistant">
            <div className="ai-msg-avatar">◉</div>
            <div className="ai-msg-content">
              {streamingText ? (
                <div className="ai-msg-text markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) + '<span class="typing-cursor">▋</span>' }} />
              ) : (
                <div className="ai-msg-text">
                  <LoadingDots />
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form className="ai-input-area" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="ai-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as React.FormEvent)
            }
          }}
          placeholder={aiLoading ? 'AI 正在回复...' : (mode === 'free' ? '输入你的问题...' : (selectedIsDir === true ? '关于这个文件夹...' : '关于这个文件...'))}
          disabled={aiLoading}
          rows={2}
        />
        <button 
          type={aiLoading ? 'button' : 'submit'} 
          className={`ai-send-btn ${aiLoading ? 'stop' : ''}`}
          onClick={aiLoading ? stopGenerate : undefined}
          title={aiLoading ? '停止' : '发送'}
        >
          {aiLoading ? <IconStop /> : <IconSend />}
        </button>
      </form>
    </div>
  )
}

// 轻量 Markdown 渲染（不需要 marked 库）
// 使用 try-catch 防止渲染错误导致整个面板崩溃
function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    let html = String(text)
      // 转义 HTML（防止 XSS）
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // 标题
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // 粗体/斜体（使用非贪婪匹配防止贪婪问题）
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // 行内代码
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // 列表（使用更严格的正则）
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // 换行
      .replace(/\n/g, '<br/>')
    return html
  } catch (e) {
    // 渲染失败时返回转义后的纯文本
    return String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  }
}

// ============ 样式注入 ============
const styles = `
/* ===== AI 面板整体 ===== */
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  user-select: none;
}

/* ===== 头部栏 ===== */
.ai-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  background: rgba(30,30,36,0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.ai-logo { color: var(--accent); display: flex; align-items: center; }

.back-btn {
  background: none; border: none; color: var(--text-dim); cursor: pointer;
  font-size: 18px; padding: 0 4px; line-height: 1;
}
.back-btn:hover { color: var(--text); }

.ai-title {
  font-weight: 600; font-size: 13px; letter-spacing: 0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 120px;
}

/* 图标按钮组 */
.ai-tool-group { display: flex; gap: 2px; }

.ai-icon-btn {
  background: none; border: none; color: var(--text-dim);
  padding: 6px; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.ai-icon-btn:hover { background: rgba(157,78,221,0.12); color: var(--accent); }
.ai-icon-btn.danger:hover { background: rgba(220,38,38,0.12); color: #ef4444; }

/* ===== 模式选择页 ===== */
.ai-mode-select {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
}

.mode-label {
  font-size: 12px; color: var(--text-dim); margin-bottom: 4px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 40px;
  background: var(--bg2);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
  width: 100%;
  max-width: 240px;
  color: var(--text);
}
.mode-card:hover:not(:disabled) {
  border-color: var(--accent);
  background: rgba(157,78,221,0.06);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(157,78,221,0.1);
}
.mode-card.disabled {
  opacity: 0.4; cursor: not-allowed;
}
.mode-card svg { color: var(--accent); }
.mode-card span { font-size: 14px; font-weight: 600; }
.mode-card small { font-size: 11px; color: var(--text-dim); }

.model-hint {
  font-size: 11px; color: var(--text-dim); margin-top: 8px;
}

/* ===== 文件标签 ===== */
.ai-file-tag {
  padding: 8px 14px;
  font-size: 11px;
  color: var(--accent);
  background: rgba(157,78,221,0.08);
  border-bottom: 1px solid var(--border-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 消息区域 ===== */
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-welcome {
  text-align: center;
  color: var(--text-dim);
  padding: 60px 20px;
  font-size: 13px;
}

/* 消息气泡 */
.ai-msg {
  display: flex;
  gap: 10px;
  max-width: 100%;
  animation: msgIn 0.2s ease-out;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.ai-msg-avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  margin-top: 2px;
}
.ai-msg-user .ai-msg-avatar {
  background: rgba(99,102,241,0.15);
  color: #818cf8;
}
.ai-msg-assistant .ai-msg-avatar {
  background: rgba(157,78,221,0.15);
  color: var(--accent);
}
.ai-msg-system .ai-msg-avatar {
  visibility: hidden;
}

.ai-msg-content {
  flex: 1;
  min-width: 0;
}

.ai-msg-text {
  line-height: 1.65;
  word-break: break-word;
  color: var(--text);
  font-size: 13px;
  user-select: text;
}
.ai-msg-user .ai-msg-text { color: var(--text); }

/* 打字光标 */
.typing-cursor {
  color: var(--accent);
  animation: blink 0.8s step-end infinite;
  font-weight: bold;
}
@keyframes blink { 50% { opacity: 0; } }

/* Markdown 内容样式 */
.ai-msg-text.markdown-body h2,
.ai-msg-text.markdown-body h3,
.ai-msg-text.markdown-body h4 {
  margin: 12px 0 6px;
  color: var(--text);
  font-weight: 600;
}
.ai-msg-text.markdown-body h2 { font-size: 15px; }
.ai-msg-text.markdown-body h3 { font-size: 13px; }
.ai-msg-text.markdown-body h4 { font-size: 12px; }
.ai-msg-text.markdown-body code {
  background: rgba(255,255,255,0.07);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
}
.ai-msg-text.markdown-body li { margin: 4px 0; list-style-position: inside; }
.ai-msg-text.markdown-body strong { color: var(--text); }
.ai-msg-text.markdown-body em { color: var(--text-dim); }

/* AI 消息复制按钮 */
.ai-msg-assistant .ai-msg-content { position: relative; }
.ai-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 6px;
}
.ai-copy-btn:hover { background: rgba(157,78,221,0.2); color: var(--accent); }
.ai-copy-btn.copied { background: rgba(34,197,94,0.15); color: #22c55e; }

/* ===== 输入区域 ===== */
.ai-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-light);
  background: rgba(26,26,38,0.95);
}

.ai-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
  padding: 6px 0;
  min-height: 36px;
  max-height: 120px;
}
.ai-textarea::placeholder { color: var(--text-dim); }
.ai-textarea:disabled { opacity: 0.5; }

.ai-send-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.ai-send-btn:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: scale(1.04);
}
.ai-send-btn.stop { background: #ef4444; }
`

// 注入样式
if (typeof document !== 'undefined' && !document.getElementById('ai-panel-styles')) {
  const s = document.createElement('style'); s.id = 'ai-panel-styles'; s.textContent = styles
  document.head.appendChild(s)
}
