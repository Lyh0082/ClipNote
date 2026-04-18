import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'

interface FileNode {
  id: string
  name: string
  isDir: boolean
  path: string
  children?: FileNode[]
}

export function FileTree() {
  const { saveDir, activeFile, openFile, setActiveFile, setActiveFileContent, reloadTree, selectedItem, selectedIsDir, setSelectedItem } = useAppStore()
  const [tree, setTree] = useState<FileNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)
  const [renaming, setRenaming] = useState<{ path: string; name: string } | null>(null)
  const [creating, setCreating] = useState<{ parent: string; isDir: boolean } | null>(null)
  const [newName, setNewName] = useState('')
  const [moving, setMoving] = useState<FileNode | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)  // 拖拽高亮

  useEffect(() => {
    if (saveDir) reloadTree()
  }, [saveDir])

  useEffect(() => {
    if (saveDir) {
      const load = async () => {
        const t = await loadTree(saveDir)
        setTree(t)
      }
      load()
    }
  }, [saveDir])

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const toggle = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleCreate = async (isDir: boolean, parentPath?: string) => {
    setContextMenu(null)
    if (!creating) {
      setCreating({ parent: parentPath || saveDir, isDir })
      setNewName(isDir ? 'new-folder' : 'new-file.md')
    }
  }

  const handleCreateConfirm = async () => {
    if (!creating || !newName.trim()) return
    const result = await window.electronAPI.fs.create({
      parentPath: creating.parent,
      name: newName.trim(),
      isDir: creating.isDir,
    })
    if (result.success) {
      setCreating(null)
      setNewName('')
      const t = await loadTree(saveDir)
      setTree(t)
    }
  }

  const handleDelete = async (node: FileNode) => {
    setContextMenu(null)
    if (confirm(`确定删除 "${node.name}"？`)) {
      await window.electronAPI.fs.delete(node.path)
      if (activeFile === node.path) {
        setActiveFile(null)
        setActiveFileContent('')
      }
      const t = await loadTree(saveDir)
      setTree(t)
    }
  }

  const handleRename = (node: FileNode) => {
    setContextMenu(null)
    setRenaming({ path: node.path, name: node.name })
    setNewName(node.name)
  }

  const handleRenameConfirm = async () => {
    if (!renaming || !newName.trim()) return
    const result = await window.electronAPI.fs.rename(renaming.path, newName.trim())
    if (result.success) {
      setRenaming(null)
      setNewName('')
      if (activeFile === renaming.path) {
        setActiveFile(result.newPath!)
      }
      const t = await loadTree(saveDir)
      setTree(t)
    }
  }

  const handleOpenInExplorer = (path: string) => {
    setContextMenu(null)
    window.electronAPI.shell.openPath(path)
  }

  // 移动到文件夹
  const handleMove = async (node: FileNode) => {
    setContextMenu(null)
    // 选择目标文件夹
    const targetDir = await window.electronAPI.dialog.selectDir()
    if (!targetDir) return
    
    // 执行移动
    const separator = targetDir.includes('\\') ? '\\' : '/'
    const newPath = targetDir + separator + node.name
    const result = await window.electronAPI.fs.rename(node.path, newPath)
    if (result.success) {
      // 如果移动的是当前打开的文件，更新路径
      if (activeFile === node.path) {
        setActiveFile(result.newPath || newPath)
      }
      const t = await loadTree(saveDir)
      setTree(t)
    } else {
      alert(`移动失败: ${result.error}`)
    }
  }

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.setData('application/json', JSON.stringify(node))
    e.dataTransfer.effectAllowed = 'move'
  }

  // 拖拽进入目标文件夹
  const handleDragEnter = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault()
    if (node.isDir) {
      e.dataTransfer.dropEffect = 'move'
      e.stopPropagation()
      setDragOver(node.path)
      console.log('[Drag] Enter folder:', node.path)
    }
  }

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault()
    if (node.isDir) {
      e.dataTransfer.dropEffect = 'move'
      e.stopPropagation()
    }
  }

  // 拖拽离开
  const handleDragLeave = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault()
    e.stopPropagation()
    // 只有当真正离开（不是进入子元素）时才清除
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX, clientY } = e
    if (
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom
    ) {
      setDragOver(null)
      console.log('[Drag] Leave folder:', node.path)
    }
  }

  // 放置到目标文件夹
  const handleDrop = async (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    console.log('[Drag] Drop on:', targetNode.path)
    
    // 只接受文件夹
    if (!targetNode.isDir) {
      console.log('[Drag] Target is not a folder:', targetNode.path)
      return
    }
    
    try {
      const nodeData = e.dataTransfer.getData('application/json')
      if (!nodeData) {
        console.log('[Drag] No drag data')
        return
      }
      
      const sourceNode: FileNode = JSON.parse(nodeData)
      console.log('[Drag] Source:', sourceNode.path, 'target:', targetNode.path)
      
      // 不能移动到自身或子目录
      if (targetNode.path === sourceNode.path || 
          targetNode.path.startsWith(sourceNode.path + '\\') || 
          targetNode.path.startsWith(sourceNode.path + '/')) {
        console.log('[Drag] Cannot move into itself or subdirectory')
        return
      }
      
      // 动态决定分隔符（与 handleMove 保持一致）
      const separator = targetNode.path.includes('\\') ? '\\' : '/'
      // 确保目标路径不以分隔符结尾
      const targetDir = targetNode.path.endsWith(separator) ? targetNode.path.slice(0, -1) : targetNode.path
      const newPath = targetDir + separator + sourceNode.name
      console.log('[Drag] Moving:', sourceNode.path, '->', newPath)
      
      const result = await window.electronAPI.fs.rename(sourceNode.path, newPath)
      console.log('[Drag] Result:', result)
      
      if (result.success) {
        if (activeFile === sourceNode.path) {
          setActiveFile(newPath)
        }
        const t = await loadTree(saveDir)
        setTree(t)
        setExpanded(prev => new Set([...prev, targetNode.path]))
        console.log('[Drag] Move succeeded, tree reloaded')
      } else {
        console.error('[Drag] Move failed:', result.error)
      }
    } catch (err) {
      console.error('[Drag] Drop error:', err)
    }
  }

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="ft-title">{saveDir.split(/[/\\]/).pop()}</span>
        <div className="ft-actions">
          <button className="tree-action-btn" onClick={() => handleCreate(false)} title="New File">+</button>
          <button className="tree-action-btn" onClick={() => handleCreate(true)} title="New Folder">F</button>
        </div>
      </div>

      <div className="file-tree-content">
        {/* 新建输入 */}
        {creating && (
          <div className="tree-input-row">
            <span className="tree-icon">{creating.isDir ? '[F]' : '[F]'}</span>
            <input
              className="tree-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateConfirm()
                if (e.key === 'Escape') setCreating(null)
              }}
              onBlur={handleCreateConfirm}
              autoFocus
            />
          </div>
        )}

        {tree.map(node => renderNode(node))}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {!contextMenu.node.isDir && (
            <div className="ctx-item" onClick={() => openFile(contextMenu.node.path)}>
              Open
            </div>
          )}
          <div className="ctx-item" onClick={() => handleMove(contextMenu.node)}>
            Move to...
          </div>
          <div className="ctx-item" onClick={() => {
            const parentPath = contextMenu.node.isDir
              ? contextMenu.node.path
              : contextMenu.node.path.replace(/[/\\][^/\\]+$/, '')  // 父目录
            handleCreate(contextMenu.node.isDir, parentPath)
          }}>
            {contextMenu.node.isDir ? 'New File Here' : 'New Subfolder'}
          </div>
          <div className="ctx-item" onClick={() => handleRename(contextMenu.node)}>
            Rename
          </div>
          {contextMenu.node.isDir && (
            <div className="ctx-item" onClick={() => {
              setContextMenu(null)
              setSelectedItem(contextMenu.node.path, true)
            }}>
              {selectedItem === contextMenu.node.path ? '✓ Selected for AI' : 'Select for AI'}
            </div>
          )}
          <div className="ctx-item" onClick={() => handleOpenInExplorer(contextMenu.node.isDir ? contextMenu.node.path : contextMenu.node.path.replace(/[/\\][^/\\]+$/, ''))}>
            Reveal in Explorer
          </div>
          <div className="ctx-divider" />
          <div className="ctx-item danger" onClick={() => handleDelete(contextMenu.node)}>
            Delete
          </div>
        </div>
      )}
    </div>
  )

  function renderNode(node: FileNode, depth = 0): React.ReactNode {
    const isExpanded = expanded.has(node.path)
    const isActive = activeFile === node.path
    const isDragOver = dragOver === node.path

    return (
      <div key={node.id}>
        {renaming?.path === node.path ? (
          <div className="tree-node tree-input-row" style={{ paddingLeft: depth * 16 + 8 }}>
            <span>{node.isDir ? '[F]' : '[F]'}</span>
            <input
              className="tree-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameConfirm()
                if (e.key === 'Escape') setRenaming(null)
              }}
              onBlur={handleRenameConfirm}
              autoFocus
            />
          </div>
        ) : (
          <div
            className={`tree-node ${isActive ? 'active' : ''} ${selectedItem === node.path ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
            style={{ paddingLeft: depth * 16 + 8 }}
            onClick={(e) => {
              e.stopPropagation()
              if (node.isDir) {
                // 先设选中，再切换展开
                setSelectedItem(node.path, true)
                toggle(node.path)
              } else {
                setSelectedItem(node.path, false)
                openFile(node.path)
              }
            }}
            onContextMenu={e => handleContextMenu(e, node)}
            draggable={true}
            onDragStart={e => handleDragStart(e, node)}
            onDragEnter={e => handleDragEnter(e, node)}
            onDragOver={e => handleDragOver(e, node)}
            onDragLeave={e => handleDragLeave(e, node)}
            onDrop={e => handleDrop(e, node)}
          >
            {node.isDir && (
              <span className="tree-toggle">
                {isExpanded ? '▾' : '▸'}
              </span>
            )}
            {!node.isDir && <span className="tree-icon">-</span>}
            <span className="tree-name">{node.name}</span>
          </div>
        )}

        {node.isDir && isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }
}

async function loadTree(dirPath: string): Promise<FileNode[]> {
  try {
    const entries = await window.electronAPI.fs.readDir(dirPath)
    const result: FileNode[] = []

    for (const entry of entries) {
      if (entry.isDir) {
        const children = await loadTree(entry.path)
        result.push({ ...entry, children })
      } else {
        result.push(entry)
      }
    }

    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return result
  } catch {
    return []
  }
}
