HTTP请求->request请求->状态码->请求头->json
  1. 爬虫 = 程序发HTTP请求 + 解析返回数据
  2. requests.get(url) → 发GET请求
  3. response.status_code → 200成功，404不存在，403被拒
  4. response.text → 拿到HTML源码
  5. response.json() → 拿到JSON数据（最省事）
  6. headers里加User-Agent → 伪装成浏览器
  7. params参数 → GET请求带查询参数
---

### 1. 爬虫的本质
- 爬虫 = 程序模拟浏览器发送 HTTP 请求 → 获取服务器返回的 HTML 或 JSON → 自动提取数据。
- 与人工浏览的区别：人看渲染后的页面，程序读原始返回内容。

### 2. HTTP 请求方法
- **GET**：获取数据，参数附在 URL 后面（如 `?q=爬虫&page=2`）。爬虫中约 90% 使用 GET。
- **POST**：提交数据，参数放在请求体里（如登录、评论）。URL 中不可见。

### 3. 使用 `requests` 库发请求
- `requests.get(url)`：发送 GET 请求，返回 `Response` 对象。
- `response.status_code`：HTTP 状态码。
- `response.text`：返回的 HTML 源码（字符串）。
- `response.json()`：若返回 JSON 格式，可直接转为 Python 字典/列表（最省事）。
- 带查询参数的 GET：`requests.get(url, params={"key": "value"})`。

### 4. 常见 HTTP 状态码
- `200`：成功
- `301`：资源已永久移动
- `403`：禁止访问（反爬常见）
- `404`：页面不存在
- `429`：请求过于频繁
- `500`：服务器内部错误

### 5. 请求头（Headers）—— 身份伪装
- 默认 `requests` 的 `User-Agent` 会暴露是 Python 脚本，易被服务器拒绝。
- 设置 `headers` 参数，模仿浏览器：
  ```python
  headers = {"User-Agent": "Mozilla/5.0 ... Chrome/125.0.0.0"}
  requests.get(url, headers=headers)
  ```
- 常用请求头：
  - `User-Agent`：浏览器型号（必带）
  - `Referer`：从哪个页面跳转过来
  - `Cookie`：登录状态
  - `Accept`：客户端能接收的格式

### 6. JSON API —— 爬虫最舒服的情况
- 许多网站提供公开 API，直接返回结构化 JSON 数据，无需解析 HTML。
- 示例：`requests.get("https://api.github.com/repos/python/cpython").json()`

---
