---
tags: [CAIP, 主输出, Cycle6, 智海Mo, 冲刺]
created: 2026-05-07
周期: 第6周
角色: 主输出（沂航）
状态: 📅 未开始
---

# Cycle 6 — 智海Mo平台实战 + 综合冲刺

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 熟悉智海Mo平台的操作流程
- [ ] 在平台上跑通完整Pipeline
- [ ] 掌握F1优化技巧
- [ ] 掌握推理时间优化技巧
- [ ] 完成最终提交代码

---

## 六步学习框架

### 1. 建立地图

```
比赛冲刺全景（从训练到提交）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  本地开发                智海平台
┌──────────┐          ┌──────────────┐
│ 数据探索  │          │ 平台环境确认  │
│ 模型训练  │ ──上传──→│ 模型推理      │
│ 优化压缩  │          │ 提交评分      │
│ ONNX导出  │          │ 结果查看      │
└──────────┘          └──────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  关键：本地训练，平台推理！
```

> **关键认知**：平台不是拿来训练的，是拿来**提交推理**的。你的推理代码必须自包含、无硬编码、能离线运行。

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| 智海平台 | **评分沙盒**：你提交代码+模型，它跑推理+打分 |
| 推理脚本 | **自包含的预测函数**：输入图片路径 → 输出类别字典 |
| F1 优化 | **类别平衡战**：Macro F1 不允许任何类别拖后腿 |
| 推理优化 | **计算效率战**：批量推理 + ONNX + 量化 = 速度翻倍 |
| 比赛策略 | **保底 + 冲刺**：先确保能提交，再优化结果 |

> **一句话本质**：比赛当天 = **先跑通再优化**。80% 的时间花在"跑通"上，20% 的时间花在"优化"上。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 竞赛影响 |
|--------|----------|----------|
| **本地环境 vs 平台环境** | PyTorch 版本/依赖不一致 | 本地跑通的代码，平台可能报错——**提前测试！** |
| **F1 最高 vs 最稳妥** | 激进方案 F1 高但可能失败 | 保底方案（简单模型）先提交，激进方案后提交 |
| **模型大小 vs 加载速度** | 大模型精度高但加载慢 | 平台有时间限制，模型文件不能太大 |
| **单次推理 vs 批量推理** | 逐张推理简单但慢 | 批量推理快但内存占用大 |

### 4. 因果链 / 易混点 / 重点

#### 因果链
```
类别不平衡 → 少数类 F1 低 → Macro F1 被拖垮
    ↓ 解决
加权损失 / Focal Loss / 过采样 → 少数类 F1 ↑ → Macro F1 ↑

逐张推理 → Python 循环开销大 → 推理慢
    ↓ 解决
批量推理 + ONNX Runtime → 减少 Python 开销 → 速度 2-5 倍

本地代码硬编码路径 → 平台路径不同 → FileNotFoundError
    ↓ 解决
用相对路径 / os.path.join → 代码可移植
```

#### 易混点（必须搞清！）

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| 训练脚本 vs 推理脚本 | 提交训练代码 | **只提交推理代码**——平台不需要你训练 |
| Focal Loss vs 加权 CE | 以为功能相同 | 加权 CE 按类别给权重；Focal Loss 按**样本难度**给权重——可以**组合使用** |
| Label Smoothing | 以为降低精度 | 反而**提升泛化**——防止模型过于自信 |
| 平台 GPU vs 本地 GPU | 以为一定能用 | 平台可能只有 CPU——**代码要兼容 CPU** |
| 提交次数 | 以为无限 | 关注平台限制——**每次提交前确认** |

#### 重点（划重点！）
1. **推理脚本必须自包含**：模型定义 + 权重加载 + 预处理 + 预测，一个文件搞定
2. **兼容 CPU 和 GPU**：`device = 'cuda' if torch.cuda.is_available() else 'cpu'`
3. **Focal Loss + Label Smoothing**：类别不平衡的杀手锏组合
4. **准备 3 套方案**：高精度版 / 平衡版 / 极速版——比赛当天根据平台情况选择

### 5. 压缩：重建架构 / 提炼本质 / 找联系 / 易错点

#### 重建架构

```
┌──────────────────────────────────────────────────┐
│           比赛当日作战计划                          │
│                                                   │
│  T-60min  登录平台，确认环境（PyTorch版本/依赖）   │
│  T-45min  上传模型文件，确认能加载                  │
│  T-30min  提交方案V2（平衡版：EfficientNet+ONNX）  │
│  T-15min  分析结果，如果有问题调整                   │
│  T-5min   提交方案V1（高精度版）或 V3（极速版）     │
│  T-0      截止！                                   │
│                                                   │
│  优先级：跑通 > F1 > 速度                          │
└──────────────────────────────────────────────────┘
```

#### 提炼本质
- **比赛本质**：在有限时间内，最大化 F1 × 速度 的综合得分
- **冲刺本质**：先确保"能提交"，再追求"提交得好"
- **F1 优化本质**：短板决定上限——找出 F1 最低的类别，针对性增强

#### 找联系（承上启下）
- Cycle 3-4 训练好的模型 → 本 Cycle **打包提交**
- Cycle 5 的 ONNX 模型 → 本 Cycle **上传到平台推理**
- 所有 Cycle 的知识 → 汇聚成**最终提交代码**

#### 易错点速记
```python
# ❌ 常见错误                                   # ✅ 正确写法
model_path = "C:/Users/xxx/model.pth"            # model_path = "model.pth"  # 相对路径
torch.load('model.pth', map_location='cuda:0')    # map_location=device  # 兼容CPU
for img in images: predict(img)  # 逐张           # batch_predict(all_images)  # 批量
```

### 6. 检索能力检查

#### 复述题
1. 比赛评分的三级指标是什么？F1 相同时比什么？
2. Focal Loss 的核心思想是什么？和加权 CrossEntropy 的区别？
3. 比赛当天应该准备几套方案？各自的目标是什么？

#### 画图题
4. 画出从本地训练到平台提交的完整工作流程图
5. 画出 F1 优化决策树：F1 上不去时该做什么

#### 推导/代码题
6. 实现一个完整的推理脚本模板（模型加载 + 批量预测 + JSON 输出）
7. 实现 FocalLoss 类，并说明 α 和 γ 参数如何影响损失计算

---

## Day 1：智海Mo平台入门

### 平台操作
1. 注册登录 [mo.zju.edu.cn](https://mo.zju.edu.cn) 或 [momodel.cn](https://momodel.cn)
2. 找到"智海算法调优"赛项
3. 熟悉Notebook环境
4. 了解资源限制（CPU/GPU/内存）
5. 学习提交流程

### 平台功能
```text
1. 在线Notebook: 类似Jupyter，可写代码跑训练
2. GPU资源: 平台免费提供
3. 数据集: 赛题数据集在平台上
4. 提交系统: 提交代码自动评分
5. Mo-Tutor: 内置教学插件
```

### 平台注意事项
```text
- 了解平台镜像中的预装库（PyTorch版本等）
- 训练好的模型需要保存并能在平台加载推理
- 提交的代码必须是完整的inference pipeline
- 注意平台上的内存和时间限制
```

---

## Day 2：Baseline全流程搭建

### Pipeline结构
```text
项目目录/
├── train.py          # 训练脚本（本地运行）
├── inference.py      # 推理脚本（平台提交）
├── model.py          # 模型定义
├── data/
│   ├── train/        # 训练集
│   └── test/         # 测试集（无标签，用于提交）
├── config.py         # 配置参数
├── utils.py          # 工具函数
└── requirements.txt  # 依赖清单
```

### 推理脚本模板（提交用）
```python
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import os
import json

class WeatherClassifier(nn.Module):
    """最终提交的模型类"""
    def __init__(self):
        super().__init__()
        # 这里放你的模型定义（与训练时一致）
        self.backbone = ...  # 你的模型
        self.classifier = nn.Linear(..., num_classes)

    def forward(self, x):
        x = self.backbone(x)
        x = self.classifier(x)
        return x

def load_model(model_path, device='cpu'):
    """加载训练好的模型"""
    model = WeatherClassifier()
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    return model

def preprocess_image(image_path):
    """单张图片预处理"""
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                            std=[0.229, 0.224, 0.225])
    ])
    image = Image.open(image_path).convert('RGB')
    return transform(image).unsqueeze(0)

def predict(model, image_tensor, device='cpu'):
    """预测单张图片"""
    with torch.no_grad():
        output = model(image_tensor.to(device))
        _, predicted = output.max(1)
    return predicted.item()

def batch_predict(model, image_folder, device='cpu'):
    """批量预测"""
    results = {}
    for img_file in os.listdir(image_folder):
        if img_file.endswith(('.jpg', '.png', '.jpeg')):
            img_path = os.path.join(image_folder, img_file)
            tensor = preprocess_image(img_path)
            pred = predict(model, tensor, device)
            results[img_file] = int(pred)
    return results

# 主函数（平台会调用这个）
if __name__ == '__main__':
    model = load_model('best_model.pth')
    results = batch_predict(model, 'test_images')
    with open('predictions.json', 'w') as f:
        json.dump(results, f)
```

---

## Day 3：F1优化策略

### 针对F1的优化技巧

```text
1. 类别不平衡处理
   └─ 加权损失函数（Class Weight）
   └─ Focal Loss（聚焦难分类样本）
   └─ 重采样（过采样少样本类别）

2. 模型集成（Ensemble）
   └─ 多个模型投票取平均
   └─ 不同初始化/不同架构

3. 后处理优化
   └─ 阈值调整
   └─ 标签平滑（Label Smoothing）
```

### Focal Loss实现
```python
class FocalLoss(nn.Module):
    def __init__(self, alpha=1, gamma=2):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        return focal_loss.mean()
```

### Label Smoothing
```python
class LabelSmoothingLoss(nn.Module):
    def __init__(self, classes, smoothing=0.1):
        super().__init__()
        self.confidence = 1.0 - smoothing
        self.smoothing = smoothing
        self.classes = classes

    def forward(self, pred, target):
        pred = F.log_softmax(pred, dim=-1)
        with torch.no_grad():
            true_dist = torch.zeros_like(pred)
            true_dist.fill_(self.smoothing / (self.classes - 1))
            true_dist.scatter_(1, target.unsqueeze(1), self.confidence)
        return torch.mean(torch.sum(-true_dist * pred, dim=-1))
```

---

## Day 4：推理时间优化策略

### 优化重点
```text
1. Batch推理（而非单张推理）
   └─ 每次处理多张图片，利用并行计算

2. 减少预处理时间
   └─ 统一resize到固定尺寸
   └─ 预处理并行化

3. 模型加速
   └─ ONNX导出（必做）
   └─ FP16推理（如果平台支持）
   └─ 模型剪枝+量化

4. 代码优化
   └─ 减少Python循环
   └─ 使用torch.no_grad()
   └─ 避免不必要的tensor拷贝
```

### 优化后的推理代码
```python
import onnxruntime as ort
import numpy as np

class OptimizedInference:
    def __init__(self, onnx_path):
        self.session = ort.InferenceSession(onnx_path)
        self.input_name = self.session.get_inputs()[0].name

    def predict_batch(self, images_tensor):
        """批量ONNX推理"""
        # images_tensor: (batch, 3, 224, 224)
        inputs = {self.input_name: images_tensor.numpy()}
        outputs = self.session.run(None, inputs)
        return np.argmax(outputs[0], axis=1)

    def measure_latency(self, batch_size=32, num_runs=50):
        """测量延迟"""
        dummy = np.random.randn(batch_size, 3, 224, 224).astype(np.float32)
        # 预热
        for _ in range(10):
            self.session.run(None, {self.input_name: dummy})
        # 计时
        start = time.time()
        for _ in range(num_runs):
            self.session.run(None, {self.input_name: dummy})
        avg = (time.time() - start) / num_runs * 1000 / batch_size
        return avg  # 每张图片的平均推理时间（ms）
```

---

## Day 5：最终冲刺 + 提交模拟

### 最终Checklist
- [ ] 数据预处理Pipeline确认
- [ ] 最佳模型选型确认（F1最高）
- [ ] 推理优化完成（时间最短）
- [ ] 提交代码能在平台运行
- [ ] 完整测试集跑通
- [ ] 准备备选方案（以防某个方案不通过）

### 提交前检查
```text
1. 依赖版本匹配（平台预装库版本）
2. 路径使用相对路径
3. 模型文件大小合理（不超过平台限制）
4. 代码无硬编码路径
5. 推理时间在限制范围内
6. 输出格式符合要求
```

### 备赛最终建议
```text
1. 保持多个实验版本：
   └─ V1: 高精度（EfficientNet-B1, 全增强, TTA）
   └─ V2: 平衡型（EfficientNet-B0, 剪枝+量化）
   └─ V3: 极速型（MobileNet, 强量化）

2. 省赛策略：
   └─ 安全为主：用V2平衡型
   └─ 根据赛题数据特点微调

3. 比赛当天：
   └─ 提前登录平台
   └─ 先跑通提交流程
   └─ 多提交几次选最优成绩
```

---

## Day 6：综合测试 + 最终复习

### 综合测试
1. 在智海Mo平台上完整提交一次
2. 记录Baseline F1和推理时间
3. 对比三种优化策略的效果

### 最终复习清单
- [ ] Python + NumPy + Matplotlib
- [ ] PyTorch完整训练流程
- [ ] CNN + ResNet原理
- [ ] 迁移学习
- [ ] 数据增强（基础+高级）
- [ ] 超参数调优
- [ ] 模型剪枝
- [ ] 知识蒸馏
- [ ] 模型量化
- [ ] ONNX导出与推理
- [ ] 智海Mo平台操作
- [ ] F1优化技巧
- [ ] 推理时间优化技巧
- [ ] 完整提交流程
