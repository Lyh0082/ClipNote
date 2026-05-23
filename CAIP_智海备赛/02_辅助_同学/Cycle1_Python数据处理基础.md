---
tags: [CAIP, 辅助, Cycle1, Python]
created: 2026-05-07
周期: 第1周
角色: 辅助（同学）
状态: 📅 未开始
---

# Cycle 1 — Python数据处理基础

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 掌握Python基础语法
- [ ] 能用NumPy处理数据
- [ ] 会用Pandas读取和操作数据
- [ ] 掌握文件和图像的基本读写操作

---

## 六步学习框架

### 1. 建立地图

```
辅助角色技术栈（你在这里 👈）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  数据层：Python + NumPy + Pandas + PIL   ← 📍 你负责
  加工层：数据增强 + 可视化 + 实验管理     ← 后续 Cycle
  评估层：F1 分析 + 混淆矩阵 + 报告       ← 后续 Cycle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  核心：确保数据准备好，主输出直接用
```

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| NumPy | **数值计算引擎**：矩阵运算比 Python 快 100 倍 |
| Pandas | **表格处理器**：CSV/Excel → 筛选/统计/聚合 → 输出 |
| PIL/OpenCV | **图像接口**：图片 ↔ NumPy 数组的桥梁 |
| os 模块 | **文件管家**：遍历/重命名/路径拼接 |

> **一句话本质**：辅助角色 = **数据搬运工 + 质检员**——确保数据干净、格式正确、随时可用。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 影响 |
|--------|----------|------|
| **数据脏 vs 模型要干净** | 损坏图片/缺失值/格式混乱 | 脏数据进模型 = 垃圾出垃圾 |
| **手动 vs 自动** | 手动翻文件夹 vs 写脚本 | 100 张图手动行，10000 张必须脚本 |

### 4. 因果链 / 易混点 / 重点

#### 易混点

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| `iloc` vs `loc` | 混用 | `iloc` 按整数位置；`loc` 按标签名 |
| `img.size` vs `img.shape` | PIL 和 NumPy 不同 | PIL 用 `.size`（W,H）；NumPy 用 `.shape`（H,W,C） |
| `os.listdir` vs `os.walk` | 只拿一层 vs 递归 | `listdir` 一层；`walk` 递归所有子目录 |

#### 重点
1. **数据质量检查**：损坏图片/缺失值/类别分布——这是辅助的首要任务
2. **NumPy ↔ PIL 互转**：图像处理的基础操作，必须熟练

### 5. 压缩

```
辅助数据三板斧：
  读 → Pandas 读 CSV / PIL 读图片
  查 → 统计分布 / 检查损坏 / 看类别均衡
  写 → 整理好的数据 → 主输出直接用
```

### 6. 检索能力检查

1. 用 Pandas 读取 CSV，筛选 score>80 的行，输出前 5 行
2. 遍历图片文件夹，统计每种格式（jpg/png/...）的数量
3. 解释 PIL 的 `.size` 和 NumPy 的 `.shape` 对同一张图片返回值的区别

---

## Day 1：Python基础语法

```python
# 变量与类型
a = 42          # int
b = 3.14        # float
c = "hello"     # str
d = [1,2,3]     # list
e = {"key":"value"}  # dict

# 控制流
if x > 0:
    print("正数")
else:
    print("非正数")

for i in range(5):
    print(i)

# 函数
def square(x):
    return x ** 2

# 列表推导式
squares = [x**2 for x in range(10)]

# 字符串操作
text = "hello,world"
parts = text.split(",")
joined = "|".join(parts)
```

### 练习
1. 写函数读取列表并返回所有偶数的平方
2. 用字典统计字符串中每个字符出现次数

---

## Day 2：NumPy基础

```python
import numpy as np

# 创建数组
arr = np.array([1, 2, 3])
zeros = np.zeros((3, 4))
rand = np.random.randn(100)

# 数组运算
a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])
print(a + b)    # 加法
print(a @ b)    # 矩阵乘法
print(a * b)    # 逐元素乘

# 索引和切片
arr = np.array([[1,2,3],[4,5,6]])
print(arr[:, 0])   # 第一列
print(arr[0, :])   # 第一行

# 统计函数
data = np.random.randn(1000)
print(f"均值: {data.mean():.3f}")
print(f"标准差: {data.std():.3f}")
print(f"最大值: {data.max():.3f}")
print(f"最小值: {data.min():.3f}")
```

### 练习
1. 生成100个随机数，计算均值和标准差
2. 创建一个 4×4 单位矩阵
3. 对数组进行归一化：(x - mean) / std

---

## Day 3：Pandas数据处理

```python
import pandas as pd

# 创建DataFrame
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'score': [85, 92, 78]
})

# 读取CSV
df = pd.read_csv('data.csv')

# 基本操作
print(df.head())        # 前5行
print(df.info())        # 基本信息
print(df.describe())    # 统计描述
print(df.columns)       # 列名

# 选择数据
df['name']              # 单列
df[['name', 'age']]     # 多列
df.iloc[0:5]            # 按行索引
df.loc[df['age'] > 30]  # 条件筛选

# 分组统计
df.groupby('category')['value'].mean()

# 缺失值处理
df.isnull().sum()
df.fillna(0, inplace=True)
df.dropna(inplace=True)
```

### 练习
1. 创建一个包含10行数据的DataFrame，练习筛选和排序
2. 读取一个CSV文件，检查缺失值并处理
3. 分组统计不同类别的平均值

---

## Day 4：图像文件操作 + OS操作

```python
import os
from PIL import Image
import numpy as np

# 文件遍历
folder_path = './data/train'
for root, dirs, files in os.walk(folder_path):
    for file in files:
        if file.endswith(('.jpg', '.png')):
            file_path = os.path.join(root, file)
            print(file_path)

# 图像读取与基本信息
img = Image.open('image.jpg')
print(f"尺寸: {img.size}")
print(f"模式: {img.mode}")
print(f"格式: {img.format}")

# 图像转NumPy数组
img_array = np.array(img)
print(f"数组形状: {img_array.shape}")

# 批量重命名
def batch_rename(folder, prefix='img'):
    for i, f in enumerate(os.listdir(folder)):
        ext = os.path.splitext(f)[1]
        os.rename(
            os.path.join(folder, f),
            os.path.join(folder, f"{prefix}_{i:04d}{ext}")
        )
```

### 练习
1. 遍历一个图片文件夹，统计每种图片格式的数量
2. 读取一张图片，输出其形状和数据类型

---

## Day 5：综合练习 + 环境搭建

### 环境搭建
```bash
conda create -n caip python=3.9
conda activate caip
pip install numpy pandas matplotlib pillow scikit-learn jupyter
pip install torch torchvision
```

### 综合练习
```python
# 1. 遍历数据文件夹，统计每个类别的图片数量
import os
from collections import Counter

data_dir = './data/train'
categories = os.listdir(data_dir)
counts = {}
for cat in categories:
    cat_path = os.path.join(data_dir, cat)
    if os.path.isdir(cat_path):
        counts[cat] = len(os.listdir(cat_path))

print("类别分布:", counts)

# 2. 用Pandas输出统计表
import pandas as pd
stats_df = pd.DataFrame({
    'category': list(counts.keys()),
    'count': list(counts.values())
})
print(stats_df)
print(f"总图片数: {stats_df['count'].sum()}")
```

---

## Day 6：测试 + 复习

### 理论题
1. NumPy数组和Python列表的区别？
2. Pandas的 iloc 和 loc 区别？
3. 图像在计算机中是如何表示的？

### 编程题
1. 用Pandas读取CSV，筛选出score>80的行
2. 遍历文件夹，统计所有图片的平均尺寸
3. 用NumPy生成数据并计算统计量

### ✅ 复习清单
- [ ] Python基础语法
- [ ] NumPy数组创建和运算
- [ ] NumPy索引切片
- [ ] Pandas读取和操作
- [ ] 图像文件操作（PIL）
- [ ] 文件遍历（os模块）
