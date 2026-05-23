---
tags: [CAIP, 主输出, Cycle4, 调优, 数据增强]
created: 2026-05-07
周期: 第4周
角色: 主输出（沂航）
状态: 📅 未开始
---

# Cycle 4 — 模型调优 + 数据增强

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 掌握5种以上数据增强技术
- [ ] 学会超参数调优策略（学习率、优化器、Batch Size）
- [ ] 理解学习率调度和早停法
- [ ] 能用交叉验证评估模型稳定性
- [ ] 掌握比赛中的调优套路

---

## 六步学习框架

### 1. 建立地图

```
模型调优的层次（影响从大到小 ↓）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 数据增强     → 影响最大！1 个好的增强顶 10 次调参
  🟠 学习率/调度器 → 第二大影响，lr 差 10 倍 F1 差 5%
  🟡 模型选型     → ResNet18 → EfficientNet-B0 可能涨 2-3%
  🟢 优化器       → Adam vs AdamW 差 0.5-1%
  🔵 正则化       → Dropout/WD 差 0.3-0.5%
  ⚪ 其他 tricks  → Label Smoothing, TTA 等
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  原则：先做影响大的，别在小事上死磕
```

> **关键认知**：数据增强是性价比最高的优化手段，**先做增强再调参数**。

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| 数据增强 | **人工制造训练样本**：让模型见到更多变化，提高泛化 |
| 学习率调度 | **搜索步长自适应**：开始大步探索，后期小步精修 |
| 早停 | **及时止损**：验证集不再改善就停，防止过拟合 |
| 超参数搜索 | **系统化试错**：用策略代替运气 |
| 优化器 | **下山策略**：Adam 自适应步长，SGD+Momentum 惯性更稳 |

> **一句话本质**：调优 = **数据层面造样本 + 训练层面控步长 + 评估层面防过拟合**。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 竞赛影响 |
|--------|----------|----------|
| **增强力度 vs 语义保持** | 翻转180°天气类别可能变 | 增强太弱没用，太强标签失效 |
| **探索 vs 利用** | 学习率大探索快但不精 | 前期大 lr 找方向，后期小 lr 精修 |
| **训练时间长 vs 调参轮次** | 每个 epoch 很慢 | 用 Early Stopping 提前终止差的实验 |
| **精度 vs 泛化** | 训练 F1 高 ≠ 验证 F1 高 | 所有调优都必须以**验证 F1** 为准 |

### 4. 因果链 / 易混点 / 重点

#### 因果链
```
数据量少 → 模型记住训练集 → 过拟合（训练99%，验证80%）
    ↓ 解决路径
数据增强 → 见到更多变化 → 泛化提升 → 验证 F1 ↑

学习率太大 → loss 震荡不收敛 / 直接 NaN
学习率太小 → 100 epoch 还没收敛
    ↓ 解决路径
学习率调度器 → 前期大后期小 → 稳定收敛到最优点

验证 loss 连续 N epoch 不降 → 还在训练 → 浪费时间 + 过拟合
    ↓ 解决路径
Early Stopping → 及时停止 → 省时间 + 防过拟合
```

#### 易混点（必须搞清！）

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| MixUp vs CutMix | 以为差不多 | MixUp 是**像素级混合**；CutMix 是**区域级替换**——CutMix 保留更多空间信息 |
| 训练集增强 vs 验证集增强 | 验证集也加增强 | **验证集/测试集只做 Resize+Normalize**，不能做随机增强 |
| StepLR vs CosineAnnealing | 随便选 | CosineAnnealing 更平滑，**竞赛首选**；StepLR 太粗暴 |
| Adam vs SGD | Adam 万能 | Adam 收敛快但泛化可能差；SGD+Momentum 泛化好但需调 lr——**比赛推荐 AdamW** |
| TTA 推理 | 以为只在训练用 | TTA 是**推理时**增强：对同一张图做多次变换，取平均预测 |

#### 重点（划重点！）
1. **数据增强是第一优先级**：Albumentations + MixUp/CutMix 是 F1 提升最大的一步
2. **CosineAnnealingLR + AdamW**：竞赛最稳妥的组合
3. **Early Stopping patience=7**：7 个 epoch 验证 F1 不涨就停
4. **实验记录**：每次实验必须记录 F1 + 推理时间 + 配置，否则白做

### 5. 压缩：重建架构 / 提炼本质 / 找联系 / 易错点

#### 重建架构

```
┌──────────────────────────────────────────────┐
│          比赛调优决策树                        │
│                                               │
│  F1 上不去？                                   │
│  ├─ 欠拟合（训练/验证都低）                    │
│  │   ├─ 加数据增强                            │
│  │   ├─ 换更大模型                             │
│  │   └─ 增加训练轮次                           │
│  └─ 过拟合（训练高验证低）                      │
│      ├─ 加数据增强 ← 最优先                    │
│      ├─ 加 Dropout / Weight Decay              │
│      ├─ Early Stopping                         │
│      └─ 用预训练模型 + 冻结微调                 │
│                                               │
│  F1 还行但推理慢？                             │
│  └─ → Cycle 5（剪枝/量化/ONNX）               │
└──────────────────────────────────────────────┘
```

#### 提炼本质
- **数据增强本质**：用先验知识（图像翻转还是猫）人造样本 → 正则化
- **学习率调度本质**：模拟退火——先高温搜索，后低温精修
- **Early Stopping 本质**：用验证集当"裁判"，训练集当"运动员"

#### 找联系（承上启下）
- Cycle 3 的 `transforms.Compose` → 本 Cycle 升级为 **Albumentations**（更强更灵活）
- Cycle 3 的固定 lr → 本 Cycle 加 **学习率调度器**（动态 lr）
- 本 Cycle 的最佳模型 → Cycle 5 做剪枝/量化（F1 已够，开始优化速度）

#### 易错点速记
```python
# ❌ 常见错误                                   # ✅ 正确写法
val_transform = A.HorizontalFlip(...)            # val_transform = A.Resize+Normalize only
scheduler.step()  # ReduceLROnPlateau 也用无参    # scheduler.step(val_loss)  # 需要传 val_loss
optimizer = Adam(lr=0.01)  # lr 太大             # optimizer = AdamW(lr=1e-3, weight_decay=0.01)
```

### 6. 检索能力检查

#### 复述题
1. MixUp 和 CutMix 的核心思想分别是什么？区别在哪？
2. 为什么验证集不能做随机数据增强？
3. AdamW 和 Adam 的区别？为什么比赛推荐 AdamW？

#### 画图题
4. 画出学习率调度曲线对比图：StepLR vs CosineAnnealingLR vs ReduceLROnPlateau
5. 画出"欠拟合 vs 过拟合"的判断决策树

#### 推导/代码题
6. 用 Albumentations 实现一个包含 5 种增强的 Pipeline，写出完整代码
7. 实现 EarlyStopping 类（patience=7），并说明如何集成到训练循环中

---

## Day 1：数据增强（基础篇）

### torchvision内置增强
```python
from torchvision import transforms

# 常用增强组合
train_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomResizedCrop(224),      # 随机裁剪缩放
    transforms.RandomHorizontalFlip(p=0.5), # 随机水平翻转
    transforms.RandomRotation(degrees=15),  # 随机旋转
    transforms.ColorJitter(                 # 颜色抖动
        brightness=0.2, contrast=0.2,
        saturation=0.2, hue=0.1
    ),
    transforms.ToTensor(),
    transforms.Normalize(mean, std)
])
```

### Albumentations（更强的增强库）
```bash
pip install albumentations
```

```python
import albumentations as A
from albumentations.pytorch import ToTensorV2

# 更强的增强策略
train_transform = A.Compose([
    A.Resize(224, 224),
    A.HorizontalFlip(p=0.5),
    A.VerticalFlip(p=0.2),
    A.RandomBrightnessContrast(p=0.5),
    A.HueSaturationValue(p=0.3),
    A.ShiftScaleRotate(shift_limit=0.1, scale_limit=0.2, rotate_limit=30, p=0.5),
    A.GaussNoise(p=0.2),
    A.CoarseDropout(max_holes=8, max_height=32, max_width=32, p=0.3),
    A.Normalize(mean, std),
    ToTensorV2()
])
```

---

## Day 2：高级数据增强

### MixUp（混合样本）
```python
def mixup_data(x, y, alpha=1.0):
    """MixUp数据增强"""
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
    else:
        lam = 1

    batch_size = x.size()[0]
    index = torch.randperm(batch_size).to(x.device)

    mixed_x = lam * x + (1 - lam) * x[index, :]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam

def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)
```

### CutMix
```python
def cutmix_data(x, y, alpha=1.0):
    """CutMix数据增强"""
    lam = np.random.beta(alpha, alpha)
    batch_size = x.size()[0]
    index = torch.randperm(batch_size).to(x.device)

    bbx1, bby1, bbx2, bby2 = rand_bbox(x.size(), lam)
    x[:, :, bbx1:bbx2, bby1:bby2] = x[index, :, bbx1:bbx2, bby1:bby2]
    lam = 1 - ((bbx2 - bbx1) * (bby2 - bby1) / (x.size()[-1] * x.size()[-2]))

    return x, y, y[index], lam
```

### 测试时增强（TTA）
```python
def predict_with_tta(model, image, tta_transforms, device):
    """测试时增强：对一张图做多种增强，取平均预测"""
    model.eval()
    predictions = []

    with torch.no_grad():
        for transform in tta_transforms:
            aug_image = transform(image)
            aug_image = aug_image.unsqueeze(0).to(device)
            output = model(aug_image)
            predictions.append(F.softmax(output, dim=1))

    # 取平均
    avg_pred = torch.stack(predictions).mean(dim=0)
    return avg_pred
```

---

## Day 3：超参数调优

### 关键超参数
```text
学习率 (lr):       最重要的超参数，推荐 1e-4 ~ 1e-2
Batch Size:        取决于GPU内存，常用 16/32/64
优化器 (optimizer): Adam默认, SGD+momentum更稳
权重衰减 (wd):      L2正则化，推荐 1e-4 ~ 1e-2
Dropout率:         防止过拟合，推荐 0.2 ~ 0.5
```

### 学习率调度
```python
import torch.optim.lr_scheduler as lr_scheduler

# 1. 步长衰减：每30个epoch学习率乘0.1
scheduler = lr_scheduler.StepLR(optimizer, step_size=30, gamma=0.1)

# 2. 余弦退火（推荐）：平滑衰减
scheduler = lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)

# 3. 余弦退火+重启
scheduler = lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=20)

# 4. ReduceLROnPlateau：验证loss不降时降低学习率
scheduler = lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='min', factor=0.5, patience=5
)

# 使用方式
for epoch in range(num_epochs):
    train()
    val_loss = validate()
    scheduler.step()              # StepLR/CosineAnnealing
    scheduler.step(val_loss)      # ReduceLROnPlateau
```

### 早停法（Early Stopping）
```python
class EarlyStopping:
    def __init__(self, patience=7, min_delta=0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0
```

---

## Day 4：调优策略实战

### 比赛调优流程
```text
1. 建立Baseline（用默认参数跑通）
2. 分析过拟合/欠拟合
3. 按优先级调优：
   ┌─ 数据增强（是提升最大的手段）
   ├─ 学习率+调度器
   ├─ 模型选择（ResNet→EfficientNet）
   ├─ 优化器（Adam→SGD+Momentum）
   └─ 权重衰减+Dropout
4. 验证集评估，记录每次实验
```

### 实验记录模板
```python
# 用字典记录每次实验
experiment = {
    'id': 'exp_001',
    'model': 'resnet18',
    'optimizer': 'Adam',
    'lr': 0.001,
    'batch_size': 32,
    'augmentation': 'basic',
    'scheduler': 'cosine',
    'epochs': 50,
    'best_f1': 0.0,
    'inference_time': 0.0,
    'notes': '第一次跑通baseline'
}
```

### 优化器选择对比
```python
# Adam（推荐入门，自适应学习率）
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# SGD + Momentum（需要调学习率，但泛化更好）
optimizer = torch.optim.SGD(
    model.parameters(),
    lr=0.01,
    momentum=0.9,
    weight_decay=1e-4
)

# AdamW（Adam的改进版，推荐）
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=0.001,
    weight_decay=0.01
)
```

---

## Day 5：综合调优实战

### 调优清单
1. **数据层面**
   - [ ] 检查类别分布是否均衡
   - [ ] 应用基础数据增强（翻转、旋转、裁剪）
   - [ ] 应用高级增强（MixUp/CutMix）
   - [ ] 检查验证集和测试集分布一致

2. **模型层面**
   - [ ] 尝试不同预训练模型（ResNet18/34, EfficientNet-B0/B1）
   - [ ] 调整最后一层输出维度
   - [ ] 添加Dropout防止过拟合

3. **训练层面**
   - [ ] 设置合适的学习率（先用lr finder）
   - [ ] 使用CosineAnnealing学习率调度
   - [ ] 加入Early Stopping
   - [ ] 使用Label Smoothing

4. **评估层面**
   - [ ] 记录每个epoch的F1
   - [ ] 分析混淆矩阵
   - [ ] 测量推理时间
   - [ ] 对比不同策略效果

---

## Day 6：测试 + 复习

### 理论题
1. 数据增强为什么能提升模型泛化能力？
2. MixUp的核心思想是什么？和CutMix的区别？
3. 学习率太大了会怎样？太小了会怎样？
4. Early Stopping的patience参数如何设置？
5. Adam和SGD的优缺点对比？

### 编程题
1. 实现一个完整的训练流程，包含CosineAnnealing调度
2. 用Albumentations实现一个包含5种增强的pipeline
3. 实现EarlyStopping类并集成到训练循环

### ✅ 复习清单
- [ ] 基础数据增强（翻转/旋转/裁剪）
- [ ] Albumentations使用
- [ ] MixUp/CutMix实现
- [ ] TTA测试时增强
- [ ] 学习率调度器
- [ ] Early Stopping
- [ ] 优化器选择
- [ ] 实验记录方法
