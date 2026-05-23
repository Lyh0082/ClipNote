---
tags: [CAIP, 主输出, Cycle3, CV, 图像分类]
created: 2026-05-07
周期: 第3周
角色: 主输出（沂航）
状态: 📅 未开始
---

# Cycle 3 — 计算机视觉 + 图像分类

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 理解CNN核心组件（卷积、池化、全连接）
- [ ] 掌握经典CNN架构（ResNet为核心）
- [ ] 能使用预训练模型做图像分类
- [ ] 理解EfficientNet和轻量级Transformer
- [ ] 完成为天气图片分类的Baseline代码

---

## 六步学习框架

### 1. 建立地图

```
CNN 架构演进（竞赛需要掌握的）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2012  AlexNet      → 证明 CNN 能赢传统方法
2014  VGG          → 证明"更深=更好"（但太重）
2015  ResNet  ⭐   → 残差连接解决退化，比赛主力
2017  MobileNet    → 轻量化，推理快
2020  EfficientNet → compound scaling，精度+速度双优
2021  ConvNeXt     → 现代化 CNN，对标 Transformer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        竞赛选型：ResNet18/34（稳妥）→ EfficientNet-B0/B1（精快）
```

> **关键认知**：比赛不需要你发明新架构，而是**选对架构 + 用好预训练权重**。迁移学习让你站在巨人肩上。

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| 卷积层 | **局部特征提取器**：用小窗口扫描，提取边缘→纹理→部件→对象 |
| 池化层 | **空间降维器**：缩小尺寸，保留最强响应，减少参数 |
| 残差连接 | **梯度高速公路**：让梯度跳过中间层直接回传 |
| 迁移学习 | **知识复用**：ImageNet 学到的特征 = 通用视觉字典 |
| F1 分数 | **分类质量的调和度量**：Precision 和 Recall 不可偏废 |

> **一句话本质**：CNN = **特征逐层抽象**（低层→边缘，中层→纹理，高层→语义），迁移学习 = **冻结低层通用特征，只学高层任务特征**。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 竞赛影响 |
|--------|----------|----------|
| **精度 vs 速度** | 大模型准但慢，小模型快但粗 | 竞赛评分 F1 优先，同 F1 比速度——**必须找到平衡点** |
| **深度 vs 退化** | 层数越多不一定越好（梯度消失） | ResNet 残差连接解决了这个问题 |
| **冻结 vs 微调** | 冻结快但精度有上限，微调慢但更精准 | 数据少冻结，数据多微调——**看数据量决策** |
| **欠拟合 vs 过拟合** | 模型容量 vs 数据量不匹配 | F1 不上去先判断是哪种，再针对性解决 |

### 4. 因果链 / 易混点 / 重点

#### 因果链
```
网络太深 → 梯度消失/退化 → 更深反而更差
    ↓ 解决
残差连接（shortcut） → 梯度直接回传 → 可以训练 100+ 层

数据量少 + 全量微调 → 过拟合 → 验证 F1 低
    ↓ 解决
冻结特征层 + 只训练分类头 → 参数少 → 不易过拟合
```

#### 易混点（必须搞清！）

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| `Conv2d` 参数量计算 | 以为和输出尺寸有关 | 参数量 = `C_out × C_in × K × K`，**与 H/W 无关** |
| `padding=1, kernel=3` | 不确定尺寸变不变 | `same padding`：输出尺寸 = 输入尺寸（stride=1 时） |
| `pretrained=True` 首次运行 | 以为报错 | 首次会下载权重文件（~100MB），耐心等 |
| F1 macro vs weighted | 用错指标 | **比赛用 Macro F1**——每个类别等权，不受类别数量影响 |
| 迁移学习"冻结" | 以为模型冻结不更新 | 是 `requires_grad=False`，反向传播跳过这些层 |

#### 重点（划重点！）
1. **ResNet 残差块**：`output = F(x) + x`——这是竞赛最常用的架构，必须能手写
2. **迁移学习两策略**：冻结只训练头（数据少）/ 全量微调（数据多）——比赛先冻结再微调
3. **F1 macro 是排名指标**：优化目标必须对齐评分标准，否则南辕北辙

### 5. 压缩：重建架构 / 提炼本质 / 找联系 / 易错点

#### 重建架构

```
┌──────────────────────────────────────────────┐
│          图像分类 Pipeline（比赛骨架）           │
│                                               │
│  原图 → Resize(224) → 增强 → ToTensor         │
│         ↓                                     │
│  Normalize(ImageNet均值/方差)                  │
│         ↓                                     │
│  预训练ResNet18（去掉最后一层）                  │
│         ↓                                     │
│  新 fc = Linear(512, num_classes)             │
│         ↓                                     │
│  CrossEntropyLoss → 训练 → 保存最优 F1 模型    │
└──────────────────────────────────────────────┘
```

#### 提炼本质
- **CNN 本质**：卷积 = 局部连接 + 权值共享 = 参数少但感受野大
- **ResNet 本质**：学残差 F(x) = H(x) - x 比直接学 H(x) 容易
- **迁移学习本质**：ImageNet 特征 ≈ 通用视觉语言，你的数据 ≈ 方言

#### 找联系（承上启下）
- Cycle 2 的 `nn.Linear` → 本 Cycle 的 `nn.Conv2d`（Linear 是 1×1 卷积的特例）
- Cycle 2 的训练循环 → 本 Cycle 加了**数据增强 + 验证循环 + F1 计算**
- 本 Cycle 的 Baseline → Cycle 4 在此基础上加数据增强 → Cycle 5 在此基础上加剪枝量化

#### 易错点速记
```python
# ❌ 常见错误                                    # ✅ 正确写法
model.fc = nn.Linear(512, 10)  # 忘记改类别数     # num_classes 根据实际数据设
transforms.Normalize((0.5,), (0.5,))              # Normalize((0.485,0.456,0.406),(0.229,0.224,0.225))  # ImageNet标准
train_transform用在验证集                          # 验证集只 Resize+ToTensor+Normalize，不做随机增强
```

### 6. 检索能力检查

#### 复述题
1. 卷积层的参数量如何计算？`Conv2d(3, 64, 3)` 有多少参数？
2. ResNet 残差连接为什么能解决退化问题？用一句话解释
3. 迁移学习的两种策略是什么？分别适用于什么场景？

#### 画图题
4. 画出 ResNet 残差块的数据流图（含 shortcut 路径）
5. 画出图像分类 Pipeline 从原始图片到预测输出的完整流程图

#### 推导/代码题
6. 给定输入 `5×5` 单通道，`Conv2d(1, 2, kernel=3, stride=1, padding=0)`，推导输出尺寸
7. 用 `torchvision.models.resnet18(pretrained=True)` 构建一个 6 类天气分类器，写出完整训练代码框架（不需要运行，关键步骤必须完整）

---

## Day 1：卷积神经网络（CNN）基础

### CNN三大核心

```text
卷积层 (Convolution):  提取局部特征
池化层 (Pooling):      降维、减少参数量
全连接层 (FC):         分类/回归输出
```

### 卷积操作
```python
import torch
import torch.nn as nn

# 2D卷积
conv = nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=1, padding=1)
# 输入: (batch, 3, H, W) → 输出: (batch, 64, H, W)

# 池化
pool = nn.MaxPool2d(kernel_size=2, stride=2)
# 输入: (batch, C, H, W) → 输出: (batch, C, H/2, W/2)

# 经典CNN结构模式
# Conv → ReLU → Pool → Conv → ReLU → Pool → FC → FC → Softmax
```

### 理解感受野
- kernel_size=3, padding=1 → 输出尺寸不变
- stride=2 → 尺寸减半
- 多层卷积叠加 → 感受野扩大

---

## Day 2：ResNet 残差网络（重点）

### 残差块（Residual Block）
```python
class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, 3, stride, 1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, 3, 1, 1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)

        # 捷径（shortcut）：处理尺寸不匹配
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, 1, stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        residual = self.shortcut(x)
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += residual       # 残差连接
        out = F.relu(out)
        return out
```

### 为什么ResNet有效？
- **解决梯度消失**：捷径让梯度直接回流
- **恒等映射**：堆叠更多层不会降低性能
- **实际使用**：ResNet-18/34/50/101（竞赛常用ResNet-18/34）

---

## Day 3：使用预训练模型（迁移学习）

```python
import torchvision.models as models

# 加载预训练ResNet18
model = models.resnet18(pretrained=True)

# 修改最后一层（ImageNet 1000类 → 天气分类N类）
num_classes = 6  # 根据天气分类类别数修改
model.fc = nn.Linear(model.fc.in_features, num_classes)

# 完整迁移学习流程
# 方案1：冻结特征提取层，只训练分类头
for param in model.parameters():
    param.requires_grad = False
for param in model.fc.parameters():
    param.requires_grad = True

# 方案2：全量微调（所有层都训练）
for param in model.parameters():
    param.requires_grad = True
```

### 其他常用预训练模型
```python
# EfficientNet (轻量高效)
import timm
model = timm.create_model('efficientnet_b0', pretrained=True, num_classes=6)

# ResNet变体
model = models.resnet34(pretrained=True)
model = models.resnet50(pretrained=True)

# MobileNet (超轻量)
model = models.mobilenet_v3_small(pretrained=True)

# ConvNeXt (现代CNN)
model = models.convnext_tiny(pretrained=True)
```

---

## Day 4：图像分类完整Pipeline

### 1. 数据加载
```python
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# 训练集数据增强
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# 验证集（只做resize和归一化）
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# 数据集（按文件夹结构：train/class1/, train/class2/, ...）
train_dataset = datasets.ImageFolder('./data/train', transform=train_transform)
val_dataset = datasets.ImageFolder('./data/val', transform=val_transform)

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=4)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=4)
```

### 2. 训练+验证循环
```python
def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return total_loss / len(loader), 100. * correct / total

def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    return total_loss / len(loader), 100. * correct / total
```

---

## Day 5：天气分类Baseline搭建

### 实战任务
1. 下载天气数据集（可先用迷你版）
2. 用ResNet18作为Baseline
3. 完成完整训练+验证流程
4. 记录基线F1分数和推理时间

### 计算F1分数的代码
```python
from sklearn.metrics import f1_score, classification_report

def compute_f1(model, loader, device):
    model.eval()
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            outputs = model(images)
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())

    f1_macro = f1_score(all_labels, all_preds, average='macro')
    f1_weighted = f1_score(all_labels, all_preds, average='weighted')
    return f1_macro, f1_weighted
```

### 模型保存与加载
```python
# 保存
torch.save({
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'best_f1': best_f1,
}, 'best_model.pth')

# 加载
checkpoint = torch.load('best_model.pth')
model.load_state_dict(checkpoint['model_state_dict'])
```

---

## Day 6：测试 + 复习

### 理论题
1. 卷积层参数量如何计算？（输入C_in, 输出C_out, kernel K）
2. ResNet残差连接解决什么问题？
3. 迁移学习的两种策略及适用场景？
4. Batch Normalization的作用？
5. 图像分类中的 F1 macro 和 F1 weighted 区别？

### 编程题
1. 从零实现一个不含BatchNorm的简单CNN
2. 用ResNet18做迁移学习，输出每个epoch的F1
3. 实现Top-1和Top-5准确率计算

### ✅ 复习清单
- [ ] CNN卷积计算
- [ ] 池化层作用
- [ ] ResNet残差块结构
- [ ] 迁移学习两种策略
- [ ] ImageFolder数据加载
- [ ] 完整训练验证流程
- [ ] F1分数计算
- [ ] 模型保存与加载
