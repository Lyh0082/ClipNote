import { clipboard, nativeImage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getConfig } from './store'

export interface SaveResult {
  success: boolean
  filePath?: string
  error?: string
}

export async function saveClipboardContent(): Promise<SaveResult> {
  const config = getConfig()
  const saveDir = config.saveDirectory || path.join(process.env.USERPROFILE || '', 'Documents', 'ClipNotes')

  // 确保目录存在
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const now = new Date().toLocaleString('zh-CN')

  // 检查是否有图像
  const image = clipboard.readImage()
  if (!image.isEmpty()) {
    return saveImage(image, saveDir, timestamp, now)
  }

  // 检查文本
  const text = clipboard.readText()
  if (text && text.trim()) {
    return saveText(text, saveDir, timestamp, now)
  }

  return { success: false, error: '剪贴板为空' }
}

function saveImage(
  image: Electron.NativeImage,
  saveDir: string,
  timestamp: string,
  now: string
): SaveResult {
  // 保存到 assets 子目录
  const assetsDir = path.join(saveDir, 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }

  // 图片文件名（带时间戳避免冲突）
  const imgFilename = `img-${timestamp}.png`
  const imgPath = path.join(assetsDir, imgFilename)

  // 写入图片文件
  try {
    fs.writeFileSync(imgPath, image.toPNG())
  } catch (err: any) {
    return { success: false, error: '保存图片失败: ' + err.message }
  }

  // 生成 Markdown 文件，引用图片
  const mdFilename = `clip-img-${timestamp}.md`
  const mdPath = path.join(saveDir, mdFilename)

  // 关键：正确的 Markdown 图片语法，使用相对路径
  // assets/img-xxx.png 表示图片在 assets 子目录
  const relativeImgPath = `assets/${imgFilename}`
  const mdContent = `# 剪贴板图像 ${now}\n\n![${imgFilename}](${relativeImgPath})\n`

  try {
    fs.writeFileSync(mdPath, mdContent, 'utf-8')
  } catch (err: any) {
    return { success: false, error: '保存 Markdown 文件失败: ' + err.message }
  }

  return { success: true, filePath: mdPath }
}

function saveText(
  text: string,
  saveDir: string,
  timestamp: string,
  now: string
): SaveResult {
  const mdFilename = `clip-${timestamp}.md`
  const mdPath = path.join(saveDir, mdFilename)

  const mdContent = `# 剪贴板文本 ${now}\n\n${text}\n`

  try {
    fs.writeFileSync(mdPath, mdContent, 'utf-8')
  } catch (err: any) {
    return { success: false, error: '保存失败: ' + err.message }
  }

  return { success: true, filePath: mdPath }
}
