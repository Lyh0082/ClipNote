---
tags: [CAIP, 辅助, Cycle3, 数据增强, 可视化]
created: 2026-05-07
周期: 第3周
角色: 辅助（同学）
状态: 📅 未开始
---

# Cycle 3 — 数据增强 + 可视化分析

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 掌握多种图像数据增强方法
- [ ] 能用Matplotlib做数据可视化
- [ ] 学会用TensorBoard监控训练
- [ ] 能对比不同数据增强的效果

---

## 六步学习框架

### 1. 建立地图

```
辅助的数据增强+可视化工作流
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  原始数据 → 增强策略设计 → 可视化验证 → 效果对比报告
     ↑              ↑              ↑
  你负责       你决策           你交付给主输出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| torchvision 增强 | **基础款**：简单够用，API 直观 |
| Albumentations | **进阶款**：更多变换、更快速度、更灵活 |
| TensorBoard | **训练仪表盘**：实时监控 loss/F1/图像 |
| 可视化 | **沟通桥梁**：用图说话，比数字直观 100 倍 |

> **一句话本质**：辅助 = **增强策略的实验者 + 训练过程的监控者 + 结果的可视化者**。

### 3. 核心矛盾

| 矛盾对 | 具体表现 |
|--------|----------|
| **增强力度 vs 标签保持** | 翻转猫还是猫，旋转180°可能晴天变日落 |
| **美观 vs 信息量** | 图好看但没信息 vs 图丑但信息全 |

### 4. 易混点 / 重点

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| torchvision vs Albumentations 输入格式 | 以为一样 | torchvision 输入 PIL；Albumentations 输入 NumPy（OpenCV 格式） |
| 训练增强 vs 验证增强 | 验证也加随机增强 | **验证集只做 Resize+Normalize**，随机增强只在训练集 |
| TensorBoard 端口 | 忘记开 | `tensorboard --logdir=runs` → 浏览器 `localhost:6006` |

### 5. 压缩

```
辅助增强三件套：
  1. torchvision（快速原型）→ Albumentations（正式增强）
  2. 可视化验证增强效果（肉眼检查标签是否还合理）
  3. TensorBoard 集成到训练代码（主输出只需调你封装好的函数）
```

### 6. 检索能力检查

1. 为什么验证集不能做随机数据增强？
2. 写出 Albumentations 的 3 个独有增强方法（torchvision 没有的）
3. 如何在 TensorBoard 中对比两个实验的 F1 曲线？

---

## Day 1：torchvision内置数据增强

```python
from torchvision import transforms
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

# 各种数据增强
basic_aug = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),   # 随机水平翻转
    transforms.RandomVerticalFlip(p=0.3),     # 随机垂直翻转
    transforms.RandomRotation(degrees=30),    # 随机旋转±30度
    transforms.RandomResizedCrop(224),        # 随机裁剪并缩放
    transforms.ColorJitter(                    # 颜色抖动
        brightness=0.2, contrast=0.2,
        saturation=0.2, hue=0.1
    ),
])

# 可视化增强效果
def visualize_augmentations(image_path, transform, num_samples=6):
    """可视化数据增强效果"""
    image = Image.open(image_path).convert('RGB')
    fig, axes = plt.subplots(2, 3, figsize=(12, 8))

    for i in range(num_samples):
        aug_image = transform(image)
        row = i // 3
        col = i % 3
        axes[row, col].imshow(aug_image)
        axes[row, col].axis('off')
        axes[row, col].set_title(f'Aug {i+1}')

    plt.tight_layout()
    plt.show()

# 使用
visualize_augmentations('sample.jpg', basic_aug)
```

---

## Day 2：Albumentations高级增强

```bash
pip install albumentations
```

```python
import albumentations as A
from albumentations.pytorch import ToTensorV2

# 更丰富的增强
advanced_aug = A.Compose([
    A.Resize(224, 224),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(p=0.5),
    A.HueSaturationValue(p=0.3),
    A.ShiftScaleRotate(
        shift_limit=0.1, scale_limit=0.2,
        rotate_limit=30, p=0.5
    ),
    A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
    A.CoarseDropout(
        max_holes=8, max_height=32,
        max_width=32, fill_value=0, p=0.3
    ),
])

# 与自定义Dataset配合使用
class AlbumentationsDataset(Dataset):
    def __init__(self, data_dir, transform=None):
        self.samples = []
        self.transform = transform
        # 遍历文件夹收集样本...
        for class_name in os.listdir(data_dir):
            class_path = os.path.join(data_dir, class_name)
            if not os.path.isdir(class_path):
                continue
            for img_name in os.listdir(class_path):
                self.samples.append((
                    os.path.join(class_path, img_name),
                    class_name
                ))

    def __getitem__(self, idx):
        img_path, label_name = self.samples[idx]
        image = cv2.imread(img_path)   # Albumentations需要OpenCV格式
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        label = self.label_to_idx[label_name]

        if self.transform:
            augmented = self.transform(image=image)
            image = augmented['image']

        return image, label
```

---

## Day 3：数据可视化分析

```python
import matplotlib.pyplot as plt
import numpy as np
from collections import Counter

# 1. 类别分布图（检查类别是否均衡）
def plot_class_distribution(data_dir):
    categories = []
    for class_name in os.listdir(data_dir):
        class_path = os.path.join(data_dir, class_name)
        if os.path.isdir(class_path):
            count = len(os.listdir(class_path))
            categories.append((class_name, count))

    categories.sort(key=lambda x: x[1], reverse=True)
    names, counts = zip(*categories)

    plt.figure(figsize=(10, 6))
    plt.bar(names, counts, color='skyblue')
    plt.xlabel('类别')
    plt.ylabel('样本数')
    plt.title('数据集类别分布')
    plt.xticks(rotation=45)
    for i, v in enumerate(counts):
        plt.text(i, v + 1, str(v), ha='center')
    plt.tight_layout()
    plt.show()

# 2. 图片尺寸分布
def plot_image_size_distribution(data_dir):
    sizes = []
    for root, _, files in os.walk(data_dir):
        for f in files:
            if f.endswith(('.jpg', '.png', '.jpeg')):
                img = Image.open(os.path.join(root, f))
                sizes.append(img.size)

    widths, heights = zip(*sizes)
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].hist(widths, bins=20, alpha=0.7)
    axes[0].set_title('宽度分布')
    axes[1].hist(heights, bins=20, alpha=0.7)
    axes[1].set_title('高度分布')
    plt.tight_layout()
    plt.show()

# 3. 对比增强前后的图像
def compare_augmentation(original, augmented, titles=['Original', 'Augmented']):
    fig, axes = plt.subplots(2, 4, figsize=(16, 8))
    for i in range(4):
        axes[0, i].imshow(original[i])
        axes[0, i].axis('off')
        axes[0, i].set_title(f'{titles[0]} {i+1}')
        axes[1, i].imshow(augmented[i])
        axes[1, i].axis('off')
        axes[1, i].set_title(f'{titles[1]} {i+1}')
    plt.tight_layout()
    plt.show()
```

---

## Day 4：TensorBoard训练监控

```python
from torch.utils.tensorboard import SummaryWriter
import numpy as np

# 1. 初始化
writer = SummaryWriter('runs/experiment_01')

# 2. 记录标量（训练过程中调用）
for epoch in range(100):
    train_loss = ...
    train_acc = ...
    val_loss = ...
    val_f1 = ...

    writer.add_scalar('Loss/train', train_loss, epoch)
    writer.add_scalar('Loss/val', val_loss, epoch)
    writer.add_scalar('Accuracy/train', train_acc, epoch)
    writer.add_scalar('F1/val', val_f1, epoch)

# 3. 记录图像
images, _ = next(iter(train_loader))
writer.add_images('Training Images', images[:8], 0)

# 4. 记录模型图
writer.add_graph(model, images[:1])

# 5. 记录超参数
writer.add_hparams({
    'lr': 0.001, 'batch_size': 32, 'optimizer': 'Adam'
}, {'hparam/f1': val_f1})

# 6. 关闭
writer.close()

# 启动TensorBoard
# tensorboard --logdir=runs
# 浏览器打开 http://localhost:6006
```

### 为团队设置TensorBoard
```python
# 辅助同学可以负责：
# 1. 集成TensorBoard到训练代码
# 2. 训练后对比多个实验的曲线
# 3. 用图表汇报训练进展

def compare_experiments(exp_dirs, metric='F1/val'):
    """对比多个实验的指标"""
    from tensorboard.backend.event_processing.event_accumulator import EventAccumulator

    plt.figure(figsize=(10, 6))
    for exp_dir in exp_dirs:
        ea = EventAccumulator(exp_dir)
        ea.Reload()
        events = ea.Scalars(metric)
        steps = [e.step for e in events]
        values = [e.value for e in events]
        plt.plot(steps, values, label=exp_dir.split('/')[-1])

    plt.xlabel('Epoch')
    plt.ylabel(metric)
    plt.legend()
    plt.grid(True)
    plt.show()
```

---

## Day 5：增强效果对比实验

```python
# 对比不同数据增强策略的效果
def compare_augmentation_strategies(model_class, train_data, val_data, strategies):
    """对比不同数据增强策略"""
    results = {}

    for name, train_transform in strategies.items():
        print(f"Testing: {name}")

        # 用不同增强训练模型
        train_dataset = datasets.ImageFolder(train_data, train_transform)
        val_dataset = datasets.ImageFolder(val_data, val_transform)  # 验证集增强不变

        model = model_class(num_classes=len(train_dataset.classes))

        # 训练记录
        writer = SummaryWriter(f'runs/{name}')

        # 训练模型...
        best_f1 = train_and_evaluate(model, train_dataset, val_dataset, writer)
        results[name] = best_f1

        writer.close()

    # 绘制对比图
    plt.figure(figsize=(10, 6))
    names = list(results.keys())
    f1s = list(results.values())
    bars = plt.bar(names, f1s)
    plt.ylabel('F1 Score')
    plt.title('不同数据增强策略对比')
    for bar, f1 in zip(bars, f1s):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f'{f1:.3f}', ha='center')
    plt.show()

    return results
```

---

## Day 6：测试 + 复习

### 理论题
1. RandomHorizontalFlip和RandomRotation各有什么作用？
2. 为什么不能对验证集做随机增强？
3. TensorBoard能记录哪些类型的数据？
4. Albumentations相比torchvision transforms的优势？

### 编程题
1. 用torchvision实现5种不同的数据增强，并可视化对比
2. 在训练代码中添加TensorBoard记录
3. 画出数据集的类别分布图和尺寸分布图

### ✅ 复习清单
- [ ] torchvision数据增强
- [ ] Albumentations使用
- [ ] 增强效果可视化
- [ ] 类别分布图绘制
- [ ] 图像尺寸分布
- [ ] TensorBoard集成
- [ ] 实验对比分析
