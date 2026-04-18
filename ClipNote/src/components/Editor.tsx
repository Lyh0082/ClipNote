import React, { useState, useEffect, useCallback, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import { useAppStore } from '../store/appStore'

// 配置 marked
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  }
}))

// 从 Markdown HTML 中提取所有相对路径的图片 src，返回完整绝对路径列表
function extractImageSrcs(html: string, mdFilePath: string): Array<{ original: string; absPath: string }> {
  const normalized = mdFilePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  parts.pop()
  const mdDir = parts.join('/')

  const results: Array<{ original: string; absPath: string }> = []

  // 匹配 <img src="..."> 中的所有 src
  html.replace(/src="([^"]+)"/gi, (_match, srcValue) => {
    if (srcValue.startsWith('file://') || srcValue.startsWith('http') || srcValue.startsWith('data:')) {
      return ''
    }
    const cleanSrc = srcValue.replace(/^\.\//, '')
    const absPath = `${mdDir}/${cleanSrc}`.replace(/\\/g, '/').replace(/\/+/g, '/')
    results.push({ original: srcValue, absPath })
    return ''
  })

  return results
}

export function Editor() {
  const {
    activeFile,
    activeFileContent,
    activeFileIsImage,
    setActiveFileContent,
    saveActiveFile
  } = useAppStore()

  const [view, setView] = useState<'edit' | 'preview' | 'split'>('split')
  const [htmlContent, setHtmlContent] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 图片文件：用 base64 显示（绕过 file:// 安全限制）
  useEffect(() => {
    let cancelled = false

    async function loadImage() {
      if (activeFileIsImage && activeFile && activeFileContent.startsWith('file://')) {
        try {
          const base64 = await window.electronAPI.fs.readImageAsBase64(activeFile)
          if (base64 && !cancelled) {
            setHtmlContent(`<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:20px;background:#1e1e1e;">
              <img src="${base64}" style="max-width:100%;max-height:100%;border-radius:8px;" />
            </div>`)
          }
        } catch {
          if (!cancelled) setHtmlContent('<p style="color:#888;text-align:center;padding:40px;">图片加载失败</p>')
        }
      } else if (activeFileIsImage && activeFileContent && activeFileContent.startsWith('data:')) {
        // 已经是 base64（兼容）
        setHtmlContent(`<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:20px;background:#1e1e1e;">
          <img src="${activeFileContent}" style="max-width:100%;max-height:100%;border-radius:8px;" />
        </div>`)
      }
    }

    loadImage()
    return () => { cancelled = true }
  }, [activeFileIsImage, activeFileContent, activeFile])

  // 转换 Markdown 为 HTML，图片用 base64 嵌入（解决 file:// 安全限制）
  useEffect(() => {
    let cancelled = false

    async function renderMarkdown() {
      if (!activeFileIsImage && activeFileContent && activeFile) {
        const rawHtml = marked(activeFileContent) as string
        const images = extractImageSrcs(rawHtml, activeFile)

        if (images.length === 0) {
          if (!cancelled) setHtmlContent(rawHtml)
          return
        }

        // 逐个读取图片转 base64
        let finalHtml = rawHtml
        for (const img of images) {
          try {
            const base64 = await window.electronAPI.fs.readImageAsBase64(img.absPath)
            if (base64 && !cancelled) {
              finalHtml = finalHtml.replace(`src="${img.original}"`, `src="${base64}"`)
            }
          } catch {
            console.warn('[Editor] 图片加载失败:', img.absPath)
            // 加载失败显示占位符
            finalHtml = finalHtml.replace(
              `src="${img.original}"`,
              'src="" style="background:#333;border:1px dashed #666;padding:40px;color:#888;text-align:center;" alt="图片加载失败"'
            )
          }
        }
        if (!cancelled) setHtmlContent(finalHtml)
      } else if (!activeFileIsImage) {
        if (!cancelled) setHtmlContent('')
      }
    }

    renderMarkdown()
    return () => { cancelled = true }
  }, [activeFileContent, activeFile, activeFileIsImage])

  // 自动保存（停止输入1秒后）
  const handleChange = useCallback((value: string) => {
    setActiveFileContent(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveActiveFile()
    }, 1000)
  }, [setActiveFileContent, saveActiveFile])

  // Ctrl+S 保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveActiveFile()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveActiveFile])

  if (!activeFile) return null

  const filename = activeFile.split(/[/\\]/).pop() || ''

  // 图片预览模式
  if (activeFileIsImage) {
    return (
      <div className="editor">
        <div className="editor-toolbar">
          <div className="toolbar-left">
            <span className="filename">🖼️ {filename}</span>
          </div>
          <div className="toolbar-right">
            <span className="img-hint">图片预览模式 · 无法编辑</span>
          </div>
        </div>
        <div className="editor-content preview">
          <div className="editor-preview">
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor">
      {/* 编辑器工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="filename">{filename}</span>
        </div>
        <div className="toolbar-right">
          <div className="view-tabs">
            <button
              className={`view-tab ${view === 'edit' ? 'active' : ''}`}
              onClick={() => setView('edit')}
            >
              编辑
            </button>
            <button
              className={`view-tab ${view === 'split' ? 'active' : ''}`}
              onClick={() => setView('split')}
            >
              分屏
            </button>
            <button
              className={`view-tab ${view === 'preview' ? 'active' : ''}`}
              onClick={() => setView('preview')}
            >
              预览
            </button>
          </div>
          <button className="toolbar-btn" onClick={saveActiveFile} title="保存 (Ctrl+S)">
            💾 保存
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className={`editor-content ${view}`}>
        {(view === 'edit' || view === 'split') && (
          <div className="editor-edit">
            <CodeMirror
              value={activeFileContent}
              height="100%"
              theme={oneDark}
              extensions={[
                markdown({ base: markdownLanguage, codeLanguages: languages }),
                EditorView.lineWrapping,
              ]}
              onChange={handleChange}
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
              }}
            />
          </div>
        )}

        {(view === 'preview' || view === 'split') && (
          <div className="editor-preview">
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
