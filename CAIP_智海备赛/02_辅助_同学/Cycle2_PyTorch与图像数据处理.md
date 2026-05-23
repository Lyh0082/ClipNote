---
tags: [CAIP, 辅助, Cycle2, PyTorch, 图像]
created: 2026-05-07
周期: 第2周
角色: 辅助（同学）
状态: 📅 未开始
---

# Cycle 2 — PyTorch基础 + 图像数据处理

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 理解深度学习基本概念
- [ ] 掌握PyTorch Tensor基本操作
- [ ] 能加载训练好的模型做推理
- [ ] 掌握图像数据读取和预处理

---

## 六步学习框架

### 1. 建立地图

```
辅助的 PyTorch 工作流
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  图像文件 → Dataset → DataLoader → 推理 → 结果
     ↑                              ↑
  你负责的数据端                你协助的评估端
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| Tensor | **GPU 友好的 N 维数组**（NumPy + 梯度追踪） |
| Dataset | **数据读取规则**：告诉你怎么拿第 i 个样本 |
| DataLoader | **批量迭代器**：自动 shuffle + batch + 多进程 |
| transforms | **图像预处理流水线**：Resize → 增强 → 归一化 |

> **一句话本质**：辅助用 PyTorch 主要做**数据加载 + 推理评估**，不需要写训练循环。

### 3. 核心矛盾

| 矛盾对 | 具体表现 |
|--------|----------|
| **自定义 vs ImageFolder** | ImageFolder 简单但要求固定目录结构；自定义灵活但代码多 |
| **CPU vs GPU** | 辅助可能没 GPU，推理要兼容 CPU |

### 4. 易混点 / 重点

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| `unsqueeze(0)` | 忘了加 batch 维 | 模型要求 4D 输入 `[B,C,H,W]`，单张图要加第 0 维 |
| `ImageFolder` 类别顺序 | 以为按文件名排 | 按**字母序**排：`cloudy=0, foggy=1, rainy=2, ...` |
| `ToTensor` | 以为只是转数组 | 还会把 `[0,255]` 归一化到 `[0,1]`，HWC→CHW |

### 5. 压缩

```
辅助核心四步：
  1. ImageFolder 加载数据 + transform 预处理
  2. DataLoader 批量迭代
  3. model.eval() + torch.no_grad() 推理
  4. 统计预测结果 + 计算指标
```

### 6. 检索能力检查

1. 解释 Tensor 形状 `[4, 3, 224, 224]` 各维度的含义
2. 写出加载 ImageFolder 数据集并创建 DataLoader 的 3 行代码
3. 为什么推理时要用 `torch.no_grad()`？

---

## Day 1：深度学习基本概念

### 直观理解
```text
深度学习 = 用多层"神经元"自动学习数据中的规律

类比：
- 输入层：看到图片的像素
- 隐藏层：识别出边缘→纹理→形状→对象
- 输出层：判断是什么类别

关键概念：
- 权重（w）：神经元连接的强度
- 偏置（b）：神经元的敏感度
- 激活函数：决定神经元是否"激活"
- 损失函数：衡量预测和真实值的差距
- 梯度下降：沿着"下山"的方向更新参数
```

### 无需手写公式，但需要理解
```python
# 简单模拟神经网络
import numpy as np

def simple_neuron(inputs, weights, bias):
    """一个神经元的计算"""
    z = np.dot(inputs, weights) + bias  # 加权求和
    output = max(0, z)                   # ReLU激活
    return output

# 一个简单的网络：2个输入 → 3个隐藏 → 1个输出
inputs = np.array([0.5, -0.2])
w1 = np.random.randn(2, 3)  # 第一层权重
b1 = np.random.randn(3)     # 第一层偏置
w2 = np.random.randn(3, 1)  # 第二层权重
b2 = np.random.randn(1)     # 第二层偏置

# 前向传播
hidden = np.maximum(0, np.dot(inputs, w1) + b1)
output = np.dot(hidden, w2) + b2
print(f"网络输出: {output}")
```

---

## Day 2：PyTorch基础操作

```python
import torch

# 创建Tensor
x = torch.tensor([[1, 2], [3, 4]])
x = torch.randn(3, 4)     # 随机
x = torch.zeros(3, 4)     # 全零
x = torch.ones(3, 4)      # 全一

# Tensor运算
a = torch.randn(2, 3)
b = torch.randn(2, 3)
c = a + b
d = a * b                 # 逐元素乘
e = a @ b.T              # 矩阵乘法

# 常用操作
x = torch.randn(3, 224, 224)
print(x.shape)            # torch.Size([3, 224, 224])
print(x.dtype)            # torch.float32

# 维度操作
x = x.unsqueeze(0)        # → (1, 3, 224, 224) 加batch维度
x = x.squeeze(0)          # → (3, 224, 224)
x = x.permute(1, 2, 0)   # 重排维度 → (224, 224, 3)

# NumPy互转
np_arr = x.numpy()
torch_arr = torch.from_numpy(np_arr)

# 设备
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
x = x.to(device)
```

### 练习
1. 创建一个[1, 3, 224, 224]的随机tensor
2. 查看它的shape、dtype、设备
3. 转成numpy数组再转回tensor

---

## Day 3：PyTorch图像数据加载

```python
from torchvision import datasets, transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import os

# 1. 使用ImageFolder（最简单，按文件夹分类）
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225])
])

dataset = datasets.ImageFolder('./data/train', transform=transform)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# 查看类别映射
print(f"类别: {dataset.classes}")
print(f"类别索引: {dataset.class_to_idx}")

# 2. 自定义Dataset（更灵活）
class WeatherDataset(Dataset):
    def __init__(self, data_dir, transform=None):
        self.data_dir = data_dir
        self.transform = transform
        self.samples = []  # [(image_path, label), ...]

        for class_name in os.listdir(data_dir):
            class_path = os.path.join(data_dir, class_name)
            if not os.path.isdir(class_path):
                continue
            for img_name in os.listdir(class_path):
                img_path = os.path.join(class_path, img_name)
                self.samples.append((img_path, class_name))

        # 标签编码
        self.classes = sorted(set(s[1] for s in self.samples))
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label_name = self.samples[idx]
        image = Image.open(img_path).convert('RGB')
        label = self.class_to_idx[label_name]

        if self.transform:
            image = self.transform(image)

        return image, label

# 使用自定义Dataset
dataset = WeatherDataset('./data/train', transform=transform)
loader = DataLoader(dataset, batch_size=32, shuffle=True)

# 检查一批数据
images, labels = next(iter(loader))
print(f"图片张量形状: {images.shape}")
print(f"标签张量形状: {labels.shape}")
print(f"类别分布: {labels.unique(return_counts=True)}")
```

---

## Day 4：加载预训练模型做推理

```python
import torch
import torchvision.models as models
from PIL import Image
from torchvision import transforms

# 1. 加载预训练模型
model = models.resnet18(pretrained=True)
model.eval()

# 2. 图片预处理
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225])
])

# 3. 推理单张图片
def predict_image(model, image_path):
    image = Image.open(image_path).convert('RGB')
    input_tensor = transform(image).unsqueeze(0)  # 加batch维度

    with torch.no_grad():
        output = model(input_tensor)
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        top5_prob, top5_idx = torch.topk(probabilities, 5)

    return top5_prob, top5_idx

# 4. 批量推理
def batch_predict(model, image_list):
    batch = torch.stack([
        transform(Image.open(p).convert('RGB'))
        for p in image_list
    ])
    with torch.no_grad():
        outputs = model(batch)
        _, predictions = outputs.max(1)
    return predictions

# 辅助：计算推理时间
import time
def measure_time(model, dummy_input, runs=50):
    with torch.no_grad():
        for _ in range(10):  # 预热
            _ = model(dummy_input)
        start = time.time()
        for _ in range(runs):
            _ = model(dummy_input)
        return (time.time() - start) / runs * 1000  # ms
```

---

## Day 5：数据质量检查

```python
import os
from PIL import Image
import numpy as np
from collections import Counter

def check_dataset(data_dir):
    """检查数据集的完整性和质量"""
    report = {
        'total_images': 0,
        'categories': {},
        'corrupted': [],
        'size_stats': {'widths': [], 'heights': []}
    }

    for class_name in os.listdir(data_dir):
        class_path = os.path.join(data_dir, class_name)
        if not os.path.isdir(class_path):
            continue

        count = 0
        for img_name in os.listdir(class_path):
            img_path = os.path.join(class_path, img_name)
            try:
                with Image.open(img_path) as img:
                    img.verify()  # 验证完整性
                    report['size_stats']['widths'].append(img.size[0])
                    report['size_stats']['heights'].append(img.size[1])
                    count += 1
            except Exception as e:
                report['corrupted'].append(img_path)

        report['categories'][class_name] = count
        report['total_images'] += count

    # 统计分析
    widths = report['size_stats']['widths']
    heights = report['size_stats']['heights']
    print(f"总图片数: {report['total_images']}")
    print(f"类别数: {len(report['categories'])}")
    print(f"类别分布: {report['categories']}")
    print(f"平均尺寸: {np.mean(widths):.0f}x{np.mean(heights):.0f}")
    print(f"损坏图片: {len(report['corrupted'])}")
    if report['corrupted']:
        print(f"损坏文件: {report['corrupted'][:5]}")

    return report

# 使用
check_dataset('./data/train')
```

---

## Day 6：测试 + 复习

### 理论题
1. Tensor的shape含义（比如[4, 3, 224, 224]）？
2. DataLoader的batch_size参数作用？
3. 为什么推理时要加 torch.no_grad()？
4. model.eval() 和 model.train() 的区别？

### 编程题
1. 用ImageFolder加载一个数据集，查看类别数
2. 加载ResNet18，对一张图片做推理
3. 检查数据集，输出类别分布

### ✅ 复习清单
- [ ] 深度学习基本概念
- [ ] Tensor创建与运算
- [ ] 维度操作
- [ ] ImageFolder使用
- [ ] 自定义Dataset
- [ ] 加载模型做推理
- [ ] 图片预处理
- [ ] 数据集质量检查
