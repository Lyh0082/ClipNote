/**
 * Ollama API 封装
 * 
 * 核心原则：
 * - 系统提示词通过 system 字段发送，不混入用户消息
 * - 使用 /api/chat 接口（支持多轮对话 + system）
 * - 参数严格按 Modelfile 配置
 */

export interface CallOllamaOptions {
  /** 用户输入文本（单轮模式） */
  prompt?: string
  /** 多轮消息数组（多轮模式），content 支持字符串或混合内容数组（含图片） */
  messages?: Array<{
    role: string
    content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
    images?: string[]
  }>
  /** 系统提示词（通过 system 字段发送） */
  systemPrompt?: string
  /** 模型名称 */
  model?: string
  /** Ollama 地址 */
  host?: string
  /** 温度参数（越低越确定严谨） */
  temperature?: number
  /** 流式回调 */
  onChunk?: (chunk: string) => void
  /** 取消信号 */
  signal?: AbortSignal
}

const DEFAULT_HOST = 'http://localhost:11434'
const DEFAULT_MODEL = 'glm-ocr:q8_0'  // 默认使用本地已安装的 GLM-OCR 模型

/**
 * 调用 Ollama API
 * 
 * 关键改进：
 * - system 提示词独立于 messages 发送（避免模型混淆角色）
 * - 严格参数控制防止重复输出
 */
export async function callOllama(options: CallOllamaOptions): Promise<string> {
  const {
    prompt,
    messages,
    systemPrompt,
    model = DEFAULT_MODEL,
    host = DEFAULT_HOST,
    temperature = 0.3,
    onChunk,
    signal,
  } = options

  let fullResponse = ''

    // 构建请求体
  const body: Record<string, any> = {
    model,
    stream: !!onChunk,
    // 核心参数——防止重复和幻觉（针对 GLM 模型优化）
    options: {
      temperature: 0.1,      // 极低温度，确保事实性
      num_ctx: 4096,         // 上下文窗口（GLM 标准）
      top_p: 0.85,
      top_k: 20,
      repeat_penalty: 1.1,   // 重复惩罚
      repeat_last_n: 64,     // 重复检测范围
      stop: ['<|endoftext|>', '<|end|>', '<|user|>', '<|assistant|>'],
    }
  }

  // 多轮对话模式：使用 /api/chat 接口
  if (messages && messages.length > 0) {
    body.messages = [
      // 系统提示词作为独立的 role='system'
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map(msg => {
        // 处理图片：images 数组转为 content 中的 image_url 对象
        if (msg.images && msg.images.length > 0 && typeof msg.content === 'string') {
          // 去掉 data:image/...;base64, 前缀，只留原始 base64
          const rawImages = msg.images.map(img => {
            const prefix = 'data:image/'
            const hasPrefix = img.includes(prefix)
            const raw = hasPrefix ? (img.split(prefix)[1]?.split(',')[1] || img) : img
            console.log('[Ollama] Image:', hasPrefix ? `has prefix, raw len=${raw.length}` : `no prefix, len=${raw.length}`, raw.slice(0, 20) + '...')
            return raw
          })
          return { role: msg.role, content: msg.content, images: rawImages }
        }
        // 处理混合内容（文本+图片数组）
        if (Array.isArray(msg.content)) {
          const contentParts: any[] = []
          for (const part of msg.content) {
            if (part.type === 'text') {
              contentParts.push({ type: 'text', text: part.text })
            } else if (part.type === 'image_url') {
              contentParts.push({ type: 'image_url', image_url: { url: part.image_url.url } })
            }
          }
          // images 数组：直接追加到 content 末尾
          if (msg.images && msg.images.length > 0) {
            for (const img of msg.images) {
              contentParts.push({ type: 'image_url', image_url: { url: img } })
            }
          }
          return { role: msg.role, content: contentParts }
        }
        return msg
      }),
    ]
  } else {
    // 单轮模式：也使用 /api/chat，但只发一条用户消息
    const userContent = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
    body.messages = [
      { role: 'user', content: userContent || '' }
    ]
  }

  console.log('[Ollama] Request:', { 
    model, 
    hasSystem: !!systemPrompt, 
    msgCount: body.messages?.length,
    temp: temperature 
  })

  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama ${res.status}: ${errText}`)
  }

  if (!onChunk) {
    const data = await res.json()
    return data.message?.content || ''
  }

  // 流式读取
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        if (data.message?.content) {
          fullResponse += data.message.content
          onChunk(fullResponse)
        }
        // 检查是否完成
        if (data.done) {
          return fullResponse
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  return fullResponse
}

// 检查 Ollama 连接状态
export async function checkOllamaStatus(host = DEFAULT_HOST): Promise<{ connected: boolean; models: string[] }> {
  try {
    const res = await fetch(`${host}/api/tags`)
    if (!res.ok) return { connected: false, models: [] }
    const data = await res.json()
    const models = (data.models || []).map((m: any) => m.name)
    return { connected: true, models }
  } catch {
    return { connected: false, models: [] }
  }
}

/**
 * 创建/更新 ClipNote 自定义模型
 * 基于 glm-ocr:q8_0，针对文字截图和文档处理优化
 */
export async function createClipNoteModel(host = DEFAULT_HOST): Promise<boolean> {
  try {
    // 先检查是否已存在，存在也强制重建（确保 Modelfile 最新）
    const modelfile = `# 使用 GLM-OCR 模型（轻量级 OCR 专用）
FROM glm-ocr:q8_0

# 系统提示词 – 针对文字截图与文档处理优化
SYSTEM """
你是 ClipNote 的文档智能助手，专门分析用户提供的文字截图或文档内容（通常通过 OCR 提取）。所有回答必须遵循以下准则：

## 核心原则
1. **仅基于提供内容**：严格基于 OCR 提取的文字回答问题，绝不添加自身预训练知识或编造信息。如果内容不足以回答，明确说"根据截图/文档中的信息无法确定"。
2. **目标导向**：用户希望快速理解文档要点，或对特定词语/段落进行深度解释。

## 回答格式（强制）
### 默认输出结构（适用大部分情况）
先输出"🎯 本质："一句话概括核心，然后按需输出"📖 通俗讲解："和"🔍 逻辑拆解："。

- **🎯 本质**：用最精炼的一句话揭示问题的底层逻辑或文档的核心结论。避免铺垫，直击要害。
- **📖 通俗讲解**：用生活化类比、具体例子或简单比喻解释抽象概念。假设用户没有专业背景。
- **🔍 逻辑拆解**：用"第一、第二、第三"或"因为…所以…"的步骤拆解复杂逻辑。

### 总结任务（用户要求总结截图/文档）
必须包含三部分，使用 Markdown 标题：
### 核心摘要
（1-2句话概括文档主题和结论）
### 要点列表
- 要点1：简短解释
- 要点2：简短解释
- （3-5个要点，每个要点后跟一句解释）
### 延伸思考
（提出1个值得进一步探究的问题，基于文档内容）

### 解释任务（用户选中某个词或短语）
输出格式：
🎯 本质：一句话本质
📖 通俗讲解：用类比或例子
🔍 逻辑拆解：
1. 原因/前提
2. 过程/机制
3. 结果/影响

### 自由问答（无特殊指令）
遵循"本质→通俗→逻辑"的结构，但可根据问题复杂度调整篇幅。如果问题极简单，只输出本质和通俗即可。

## 风格约束
- **禁止客套话**：不要说"这是一个很好的问题"等废话，直接给出答案。
- **禁止模糊指代**：不要用"如上所述"，始终明确引用文档中的具体内容。
- **语言简洁**：避免长句，每句话尽量不超过20字。使用主动语态。
"""

# 模型参数（GLM-OCR 专用优化）
PARAMETER temperature 0.1
PARAMETER num_ctx 4096
PARAMETER top_p 0.85
PARAMETER repeat_penalty 1.1
`

    console.log('[Ollama] 创建/更新 clipnote 自定义模型（glm-ocr:q8_0）...')
    
    const res = await fetch(`${host}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'clipnote',
        modelfile: modelfile,
      }),
    })

    if (!res.ok) {
      throw new Error(`创建模型失败: ${res.status}`)
    }

    // 流式读取创建进度
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      const lines = text.split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.status) console.log(`[Ollama] ${data.status}`)
          if (data.error) throw new Error(data.error)
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('创建模型失败')) throw e
        }
      }
    }

    console.log('[Ollama] ✅ clipnote 模型（glm-ocr）创建成功')
    return true
  } catch (err: any) {
    console.error('[Ollama] 创建模型失败:', err?.message || err)
    return false
  }
}
