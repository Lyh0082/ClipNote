---
tags: [CAIP, 主输出, Cycle1, Python]
created: 2026-05-07
周期: 第1周
角色: 主输出（沂航）
状态: 📅 未开始
---

# Cycle 1 — Python编程基础 + 开发环境搭建

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 掌握Python基础语法（变量、类型、控制流、函数）
- [ ] 能用NumPy进行数组运算和矩阵操作
- [ ] 能用Matplotlib绘制基本图表
- [ ] 会用Jupyter Notebook进行交互式编程
- [ ] 搭建PyTorch开发环境（Anaconda + CUDA + PyTorch）

---

## 六步学习框架

### 1. 建立地图

```
竞赛技术栈全景（你在这里 👈）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layer 5  提交评分        智海Mo平台
Layer 4  推理优化        ONNX → 量化 → 剪枝          ← Cycle 5
Layer 3  模型调优        数据增强 → 超参数 → 蒸馏     ← Cycle 3-4
Layer 2  深度学习框架     PyTorch（Tensor/autograd/nn） ← Cycle 2
Layer 1  编程基础        Python + NumPy + Matplotlib   ← 📍 你在这里
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ↑ 底层不动，上层全垮
```

> **关键认知**：Python/NumPy 不是"学前班"，是整个 Pipeline 的地基。后面每个 Bug 都可能回到这一层。

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| Python 变量 | 指向对象的**名字标签**（不是盒子） |
| NumPy 数组 | **连续内存 + 形状信息 + 运算规则** |
| Matplotlib 图表 | **数据 → 美学映射**（x→横轴，y→纵轴，color→维度） |
| 函数 | **输入→变换→输出**的黑盒 |
| 类（Class） | **数据 + 行为**的封装体 |

> **一句话本质**：本 Cycle 一切围绕 **"数据怎么存、怎么变、怎么看"**——存储用 Python/NumPy，变换用函数/方法，查看用 Matplotlib。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 竞赛影响 |
|--------|----------|----------|
| **灵活 vs 效率** | Python 列表方便但慢；NumPy 刚性但快 | 训练循环用 Python，矩阵运算必须用 NumPy |
| **动态类型 vs 类型安全** | `1 + "1"` 不报错直到运行时 | Tensor dtype 不匹配是 Debug 重灾区 |
| **抽象 vs 控制** | 高级 API 省事但黑盒 | `DataLoader` 出错你不知道内部怎么走的 |

> **竞赛实战**：在速度关键处（矩阵运算、数据加载）用 NumPy/PyTorch，在逻辑控制处用 Python——不要混反了。

### 4. 因果链 / 易混点 / 重点

#### 因果链
```
Python 列表慢 → NumPy 用 C 连续内存 → 向量化运算
                                    ↓
                          广播机制 = 形状对齐的隐式循环
```

#### 易混点（必须搞清！）

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| `a = [1,2]; b = a; b[0]=9` | `a` 也变了！ | 赋值是**引用**，不是拷贝 |
| `[[1]] * 3` | 三个子列表**指向同一个对象** | 用 `[[1] for _ in range(3)]` |
| `a @ b` vs `a * b` | `@` 是矩阵乘，`*` 是逐元素 | 记：`@` = **@**矩阵乘 |
| `arr[0,:]` vs `arr[:,0]` | 行 vs 列搞反 | **逗号前是行，逗号后是列** |
| `reshape` vs `transpose` | 顺序不同 | `reshape` 只改形状不改数据顺序；`transpose` 交换轴 |
| `==` vs `is` | 值相等 vs 同一对象 | `is` 检查内存地址 |

#### 重点（划重点！）
1. **NumPy 广播机制**：形状从后向前对齐，缺维=复制——后面 PyTorch 广播规则一模一样
2. **矩阵乘法 `@`**：竞赛中 99% 的运算都是矩阵乘，必须秒反应
3. **切片不复制**：`arr[:]` 是 view 不是 copy，修改会影响原数组

### 5. 压缩：重建架构 / 提炼本质 / 找联系 / 易错点

#### 重建架构（三张卡记住整个 Cycle）

```
┌─────────────────────────────────────────┐
│            Python 数据三板斧              │
│                                          │
│  存储: list → dict → NumPy ndarray       │
│   ↓                                      │
│  变换: 函数 → 类方法 → 向量化运算         │
│   ↓                                      │
│  可视: print → Matplotlib → 交互式图表    │
└─────────────────────────────────────────┘
```

#### 提炼本质
- **Python 哲学**：一切皆对象，变量是标签不是盒子
- **NumPy 本质**：用 C 内存 + 向量化 = 比 Python 循环快 100 倍
- **Matplotlib 本质**：`plt.plot(x, y)` + 美化参数 = 所有图表

#### 找联系（承上启下）
- Python list → **NumPy ndarray** → PyTorch Tensor（三代演进，API 几乎一致）
- `np.array` → `torch.tensor`；`np.dot` → `torch.matmul`；`np.reshape` → `torch.view`
- Matplotlib 画 loss 曲线 → 后面 TensorBoard 自动画

#### 易错点速记
```python
# ❌ 常见错误写法              # ✅ 正确写法
b = a                          # b = a.copy()
[[0]] * 3                      # [[0] for _ in range(3)]
arr.reshape(2,3)  # 忘记赋值   arr = arr.reshape(2,3)
for i in range(len(a)):       # for val in a:  （Pythonic）
```

### 6. 检索能力检查

#### 复述题（闭卷说清楚）
1. NumPy 广播机制的规则是什么？`shape (3,1) + shape (1,4)` 结果是什么形状？
2. Python 中 `=` 赋值、浅拷贝 `.copy()`、深拷贝 `copy.deepcopy()` 的区别？
3. `a @ b` 和 `a * b` 的区别？各自要求什么形状？

#### 画图题
4. 画出 `(3, 4)` 形状的数组，标注 `arr[1, :]` 和 `arr[:, 2]` 分别取到哪些元素
5. 画出从 Python list → NumPy array → PyTorch Tensor 的演进关系图

#### 推导/代码题
6. 用纯 Python（不用 NumPy）实现两个 3×3 矩阵的乘法，然后用 NumPy 一行实现
7. 用 NumPy 实现 softmax：$\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_j e^{x_j}}$（注意数值稳定性，减去最大值）

---

## Day 1：Python基础语法

### 必学知识点

```python
# 1. 变量与数据类型
a = 42          # int
b = 3.14        # float
c = "hello"     # str
d = True        # bool
e = [1,2,3]     # list
f = (1,2,3)     # tuple
g = {"a":1}     # dict

# 2. 控制流
if x > 0:
    print("正数")
elif x == 0:
    print("零")
else:
    print("负数")

for i in range(10):
    print(i)

while x > 0:
    x -= 1

# 3. 函数
def add(a, b):
    """返回两数之和"""
    return a + b

# 4. 列表推导式
squares = [x**2 for x in range(10)]
```

### 练习任务
1. 写一个函数计算斐波那契数列前n项
2. 用列表推导式生成所有偶数的平方
3. 练习字符串操作：分割、拼接、格式化

---

## Day 2：Python进阶

### 必学知识点

```python
# 1. 面向对象基础
class Dog:
    def __init__(self, name):
        self.name = name
    def bark(self):
        return f"{self.name} says woof!"

# 2. 文件操作
with open("data.txt", "r") as f:
    content = f.read()

# 3. 异常处理
try:
    result = 10 / 0
except ZeroDivisionError:
    print("不能除以零")

# 4. 模块导入
import numpy as np
from collections import defaultdict
```

---

## Day 3：NumPy 数值计算（重点）

### 必学知识点

```python
import numpy as np

# 创建数组
arr = np.array([1, 2, 3])
zeros = np.zeros((3, 4))
rand = np.random.randn(3, 3)

# 数组运算
a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])
c = a + b        # 逐元素加法
d = a @ b        # 矩阵乘法

# 广播机制
x = np.array([1, 2, 3])
y = x + 5        # [6, 7, 8]

# 索引与切片
arr = np.array([[1,2,3],[4,5,6],[7,8,9]])
print(arr[0, :])    # 第一行
print(arr[:, 1])    # 第二列

# 统计运算
print(arr.mean())   # 均值
print(arr.std())    # 标准差
print(arr.max())    # 最大值

# 重塑与转置
arr.reshape(-1, 1)
arr.T               # 转置
```

### 练习任务
1. 生成 5×5 随机矩阵，计算每行均值
2. 用NumPy实现 softmax 函数
3. 矩阵乘法验证（手动 vs numpy）

---

## Day 4：Matplotlib 数据可视化

### 必学知识点

```python
import matplotlib.pyplot as plt
import numpy as np

# 折线图
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y, label="sin(x)")
plt.legend(); plt.grid(True); plt.show()

# 柱状图
plt.bar(['A','B','C'], [3,7,2]); plt.show()

# 散点图
plt.scatter(np.random.randn(100), np.random.randn(100), alpha=0.5)

# 子图
fig, axes = plt.subplots(2, 2, figsize=(10, 8))

# 图像显示
from PIL import Image
img = Image.open("image.jpg")
plt.imshow(img); plt.axis('off')
```

---

## Day 5：环境搭建 + 综合练习

### 环境搭建
```bash
conda create -n caip python=3.9
conda activate caip
pip install numpy pandas matplotlib pillow scikit-learn
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install jupyter
jupyter notebook
```

### 综合编程练习
用NumPy+Matplotlib生成三类随机数据并可视化散点图。

---

## Day 6：测试 + 复习

### 理论题
1. Python可变/不可变类型有哪些？
2. NumPy广播机制是什么？举例说明
3. 矩阵乘法 vs 逐元素乘法区别？

### 编程题
1. 用NumPy实现简单线性回归（伪逆法）
2. 用Matplotlib画 y=x² 和 y=x³ 曲线
3. 写函数读取CSV并统计每列均值

### ✅ 复习清单
- [ ] Python数据类型和控制流
- [ ] 函数和作用域
- [ ] 列表/字典/集合操作
- [ ] NumPy创建数组和运算
- [ ] NumPy索引和切片
- [ ] Matplotlib绘图
- [ ] 环境搭建完成
