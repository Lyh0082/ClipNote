---
tags: [CAIP, 主输出, Cycle5, 模型优化, 压缩, ONNX]
created: 2026-05-07
周期: 第5周
角色: 主输出（沂航）
状态: 📅 未开始
---

# Cycle 5 — 模型优化与压缩（比赛得分关键）

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 理解模型剪枝的原理和实现
- [ ] 掌握知识蒸馏（Teacher-Student）
- [ ] 掌握模型量化（PTQ和QAT）
- [ ] 学会ONNX导出和推理
- [ ] 了解TensorRT基本使用

---

## 六步学习框架

### 1. 建立地图

```
模型优化三板斧（F1 已够，优化速度）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step 1  剪枝  → 删掉不重要的参数（减少计算量）
  Step 2  蒸馏  → 大模型教小模型（用精度换速度）
  Step 3  量化  → FP32 → INT8（4 倍压缩 + 2-4 倍加速）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  最后一步  ONNX 导出 → 跨平台推理加速
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  每一步都要验证：F1 掉了多少？推理快了多少？
```

> **关键认知**：这是**比赛得分关键 Cycle**。F1 相同时比速度——优化推理时间就是加分。

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| 剪枝 | **删参数**：移除不重要的权重/通道，减少计算量 |
| 蒸馏 | **传知识**：大模型的软标签包含类别间关系，比硬标签信息更丰富 |
| 量化 | **降精度**：FP32(4字节) → INT8(1字节)，牺牲精度换速度 |
| ONNX | **换格式**：PyTorch → 通用中间格式 → 专用推理引擎加速 |
| TensorRT | **极致加速**：NVIDIA 专用推理引擎，层融合+核选择+量化 |

> **一句话本质**：模型优化 = **删（剪枝）→ 教（蒸馏）→ 压（量化）→ 换（ONNX）**——逐步在精度和速度间找平衡。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 竞赛影响 |
|--------|----------|----------|
| **精度 vs 速度** | 剪枝/量化越多越快但 F1 掉 | **这是本 Cycle 的核心矛盾**，也是比赛的核心矛盾 |
| **非结构化 vs 结构化剪枝** | 非结构化压缩率高但不加速，结构化直接加速但精度掉更多 | **比赛用结构化**（框架原生加速） |
| **PTQ vs QAT** | PTQ 简单但精度可能掉，QAT 精度好但需重新训练 | 时间紧用 PTQ，有闲用 QAT |
| **蒸馏依赖 vs 独立性** | 需要大模型做教师 | 教师模型本身也要训练——成本翻倍 |

### 4. 因果链 / 易混点 / 重点

#### 因果链
```
剪枝 → 权重置零 → 参数少了但稀疏矩阵不加速（非结构化）
    ↓ 解决
结构化剪枝 → 删整个 channel → 计算图变小 → 实际加速

量化 → FP32→INT8 → 精度损失 → 分类边界模糊 → F1 掉
    ↓ 解决
校准（Calibration） → 用真实数据确定量化范围 → 精度损失减小

剪枝/量化后 F1 掉太多
    ↓ 解决
剪枝后微调（Fine-tune）→ 恢复精度 → 或者用蒸馏代替直接训练
```

#### 易混点（必须搞清！）

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| 非结构化 vs 结构化剪枝 | 以为都能加速 | **非结构化不加速**（稀疏矩阵运算慢）；**结构化才加速**（直接减少计算） |
| 温度 T 的作用 | 以为调温没用 | T 越大软标签越平滑 → 信息越"模糊"但类别关系更明确；T=1 退化为普通训练 |
| PTQ vs QAT | 分不清 | PTQ = 训练后直接量化（快）；QAT = 训练中模拟量化（准） |
| ONNX vs TensorRT | 以为一样 | ONNX 是**格式**；TensorRT 是**引擎**——ONNX → TensorRT 是两步 |
| `torch.quantization` 版本 | API 混乱 | PyTorch 2.x 用 `torch.ao.quantization`，旧版用 `torch.quantization` |

#### 重点（划重点！）
1. **比赛优化顺序**：先蒸馏提精度 → 再剪枝减计算 → 最后量化 + ONNX 提速度
2. **每步必须验证 F1**：剪枝/量化后跑一次完整验证，记录 F1 变化
3. **ONNX 导出是必做项**：即使不做量化，ONNX Runtime 也能提速 1.5-2 倍

### 5. 压缩：重建架构 / 提炼本质 / 找联系 / 易错点

#### 重建架构

```
┌──────────────────────────────────────────────────┐
│       比赛优化 Pipeline（建议执行顺序）              │
│                                                   │
│  1. Baseline（ResNet18 + 基础增强）→ 记录 F1+时间   │
│  2. 数据增强优化（Albumentations, MixUp）           │
│  3. 模型选型（EfficientNet-B0/B1）                 │
│  4. 超参数调优（LR, Scheduler）                     │
│  5. 知识蒸馏（ResNet50→EfficientNet-B0）           │
│  6. 结构化剪枝（10-30%）+ 微调                     │
│  7. PTQ 量化（INT8）                               │
│  8. ONNX 导出 + ONNX Runtime 推理                  │
│  9. TensorRT（如有 GPU）                           │
│                                                   │
│  ⚠️ 每步记录：F1 = ?  推理时间 = ?  参数量 = ?      │
└──────────────────────────────────────────────────┘
```

#### 提炼本质
- **剪枝本质**：网络中有大量"冗余"参数，删掉不影响输出
- **蒸馏本质**：软标签携带类别相似性信息（如"猫更像狗不像卡车"），比硬标签更"有营养"
- **量化本质**：用更少位数近似表示权重/激活，精度换速度
- **ONNX 本质**：PyTorch 的动态图 → 静态计算图 → 编译优化

#### 找联系（承上启下）
- Cycle 4 调好的 F1 → 本 Cycle **在此基础上优化速度**（F1 不能掉太多）
- 本 Cycle 的 ONNX 模型 → Cycle 6 提交到智海平台
- 蒸馏 + 剪枝 + 量化 = **三件套组合**，效果叠加但不是线性叠加

#### 易错点速记
```python
# ❌ 常见错误                                 # ✅ 正确写法
prune.l1_unstructured(...)  # 剪完不加速     # prune.ln_structured(dim=0)  # 结构化剪枝才加速
model.to('cuda')  # 量化后                    # 量化在 CPU 上做，model.cpu()
torch.onnx.export(model.train())               # model.eval()  # 必须先切评估模式
```

### 6. 检索能力检查

#### 复述题
1. 结构化剪枝和非结构化剪枝的区别？为什么比赛用结构化？
2. 知识蒸馏中温度参数 T 的作用？T 太大/太小分别会怎样？
3. PTQ 和 QAT 的流程分别是什么？各自适用场景？

#### 画图题
4. 画出知识蒸馏的架构图（Teacher + Student + 损失函数组合）
5. 画出从 PyTorch 模型到 ONNX 到 TensorRT 的转换流程图

#### 推导/代码题
6. 写出知识蒸馏损失函数的公式：$L = \alpha \cdot L_{distill} + (1-\alpha) \cdot L_{CE}$，解释每项含义
7. 实现一个完整的 ONNX 导出 + ONNX Runtime 推理代码，并测量推理时间对比 PyTorch

---

## Day 1：模型剪枝

### 为什么剪枝？
- 减少参数量 → 减少推理时间
- 压缩模型大小
- 在精度损失不大的情况下大幅提速

### 结构化剪枝 vs 非结构化剪枝
```text
非结构化剪枝：将权重接近0的置零，不改变结构
              优点：实现简单，压缩率高
              缺点：需要专用硬件加速，通用框架不加速

结构化剪枝：剪掉整个卷积核/channel
              优点：直接减少计算量，框架原生加速
              缺点：精度损失可能更大
```

### 使用torch.pruning（非结构化剪枝）
```python
import torch
import torch.nn.utils.prune as prune

model = models.resnet18(pretrained=True)

# 对某个卷积层进行剪枝（剪掉30%权重）
prune.l1_unstructured(model.conv1, name='weight', amount=0.3)

# 移除剪枝掩码（使权重永久化）
prune.remove(model.conv1, 'weight')

# 批量剪枝所有卷积层
for name, module in model.named_modules():
    if isinstance(module, nn.Conv2d):
        prune.l1_unstructured(module, name='weight', amount=0.3)
        prune.remove(module, 'weight')
```

### 结构化剪枝（Channel剪枝）
```python
# 对卷积层的channel进行剪枝
prune.ln_structured(model.conv1, name='weight', amount=0.3, n=2, dim=0)
# dim=0 表示剪掉整个输出channel
```

### 剪枝后微调
```python
# 剪枝后必须微调（Fine-tune）恢复精度
# 使用较小的学习率训练几个epoch
optimizer = torch.optim.SGD(model.parameters(), lr=1e-4, momentum=0.9)
for epoch in range(10):
    train_one_epoch(model, train_loader, criterion, optimizer, device)
```

---

## Day 2：知识蒸馏

### 核心思想
```text
Teacher（大模型）→ 传授知识 → Student（小模型）
                      ↓
Student学习Teacher的"软标签"（概率分布），而不仅仅是硬标签

软标签：模型输出的概率分布（包含类别间的关系信息）
硬标签：one-hot编码的真实标签
```

### 实现代码
```python
def knowledge_distillation_loss(student_outputs, teacher_outputs, labels, T=4, alpha=0.7):
    """
    student_outputs: 学生模型输出
    teacher_outputs: 教师模型输出（固定，不更新梯度）
    labels: 真实标签
    T: 温度参数（越大，软标签越平滑）
    alpha: 蒸馏损失和CE损失的权重比例
    """
    # 蒸馏损失（KL散度）
    soft_targets = F.softmax(teacher_outputs / T, dim=1)
    soft_prob = F.log_softmax(student_outputs / T, dim=1)
    distill_loss = F.kl_div(soft_prob, soft_targets, reduction='batchmean') * (T ** 2)

    # 常规交叉熵损失
    ce_loss = F.cross_entropy(student_outputs, labels)

    # 组合损失
    return alpha * distill_loss + (1 - alpha) * ce_loss

# 训练流程
teacher_model = models.resnet50(pretrained=True).to(device)
student_model = models.resnet18(pretrained=True).to(device)

# 冻结教师模型
teacher_model.eval()
for param in teacher_model.parameters():
    param.requires_grad = False

# 训练学生模型
for epoch in range(num_epochs):
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        with torch.no_grad():
            teacher_outputs = teacher_model(images)

        student_outputs = student_model(images)
        loss = knowledge_distillation_loss(
            student_outputs, teacher_outputs, labels,
            T=4, alpha=0.7
        )

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
```

### 蒸馏参数调优
```text
T（温度）：   默认4，T越大软标签越平滑
             太大 → 信息过于模糊
             太小 → 退化为普通训练
alpha（权重）：默认0.7，蒸馏损失占比
              太大 → 过度依赖教师
              太小 → 蒸馏效果不明显
```

---

## Day 3：模型量化

### 量化原理
```text
FP32（32位浮点）→ INT8（8位整数）

好处：
- 模型大小减少4倍
- 推理速度提升2-4倍
- 功耗降低

两种方式：
1. PTQ（训练后量化）：训练完直接量化，简单但可能有精度损失
2. QAT（量化感知训练）：训练中模拟量化，精度更好
```

### PTQ（训练后量化）
```python
import torch.quantization as quant

# 准备模型
model = models.resnet18(pretrained=True)
model.eval()
model.cpu()

# 配置量化
model.qconfig = quant.default_qconfig
# 或者使用更激进的量化
# model.qconfig = quant.get_default_qconfig('fbgemm')

# 准备量化
model_prepared = quant.prepare(model)

# 校准（用一小部分数据跑一遍推理，确定量化范围）
calibration_loader = DataLoader(calib_dataset, batch_size=32)
with torch.no_grad():
    for images, _ in calibration_loader:
        model_prepared(images)

# 转换量化模型
model_quantized = quant.convert(model_prepared)

# 对比大小
import sys
print(f"Original: {sys.getsizeof(model.state_dict())} bytes")
print(f"Quantized: {sys.getsizeof(model_quantized.state_dict())} bytes")
```

### QAT（量化感知训练）
```python
model = models.resnet18(pretrained=True)
model.train()
model.qconfig = quant.default_qat_qconfig

# 准备QAT
model_prepared = quant.prepare_qat(model, inplace=False)

# 训练（使用较小的学习率）
optimizer = torch.optim.SGD(model_prepared.parameters(), lr=1e-5)
for epoch in range(5):
    train_one_epoch(model_prepared, train_loader, criterion, optimizer, device)

# 转换
model_prepared.eval()
model_quantized = quant.convert(model_prepared)
```

---

## Day 4：ONNX导出 + 推理加速

### ONNX（Open Neural Network Exchange）

```python
# 安装
# pip install onnx onnxruntime

import torch
import onnx
import onnxruntime as ort

# 导出ONNX
model = models.resnet18(pretrained=True)
model.eval()
model.cpu()

dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,                     # 模型
    dummy_input,               # 示例输入
    "model.onnx",              # 输出文件名
    export_params=True,        # 导出参数
    opset_version=11,          # ONNX算子版本
    do_constant_folding=True,  # 常数折叠优化
    input_names=['input'],     # 输入名
    output_names=['output'],   # 输出名
    dynamic_axes={             # 动态batch
        'input': {0: 'batch_size'},
        'output': {0: 'batch_size'}
    }
)

# ONNX推理
session = ort.InferenceSession("model.onnx")
input_name = session.get_inputs()[0].name

# 推理
onnx_input = {input_name: dummy_input.numpy()}
output = session.run(None, onnx_input)
```

### 推理速度对比
```python
import time

def measure_inference_time(model, input_tensor, device, num_runs=100):
    """测量推理时间（毫秒）"""
    model.eval()
    model.to(device)

    # 预热
    with torch.no_grad():
        for _ in range(10):
            _ = model(input_tensor.to(device))

    # 正式测量
    if device == 'cuda':
        torch.cuda.synchronize()

    start = time.time()
    with torch.no_grad():
        for _ in range(num_runs):
            _ = model(input_tensor.to(device))
    end = time.time()

    avg_time = (end - start) / num_runs * 1000  # ms
    return avg_time

# 对比PyTorch vs ONNX Runtime
pytorch_time = measure_inference_time(model, dummy_input, 'cpu')

import onnxruntime as ort
session = ort.InferenceSession("model.onnx")
start = time.time()
for _ in range(100):
    session.run(None, {input_name: dummy_input.numpy()})
onnx_time = (time.time() - start) / 100 * 1000

print(f"PyTorch: {pytorch_time:.2f}ms")
print(f"ONNX:    {onnx_time:.2f}ms")
print(f"Speedup: {pytorch_time/onnx_time:.2f}x")
```

---

## Day 5：TensorRT 简介 + 综合优化

### TensorRT（NVIDIA推理优化引擎）
```bash
# 安装（需要NVIDIA GPU）
pip install tensorrt
```

```python
import tensorrt as trt

# ONNX转TensorRT引擎
logger = trt.Logger(trt.Logger.WARNING)
builder = trt.Builder(logger)
network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
parser = trt.OnnxParser(network, logger)

with open("model.onnx", "rb") as f:
    parser.parse(f.read())

config = builder.create_builder_config()
config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 1 << 30)  # 1GB

# FP16模式（进一步加速）
if builder.platform_has_fast_fp16:
    config.set_flag(trt.BuilderFlag.FP16)

engine = builder.build_serialized_network(network, config)
```

### 比赛中的优化策略总结

```text
比赛优化Pipeline（建议顺序）:
┌── 1. Baseline 建立（ResNet18，基本增强）
├── 2. 数据增强优化（Albumentations, MixUp）
├── 3. 模型选型（EfficientNet-B0/B1）
├── 4. 超参数调优（LR, Scheduler）
├── 5. 知识蒸馏（ResNet50 → EfficientNet-B0）
├── 6. 剪枝（结构化剪枝10-30%）
├── 7. 量化（PTQ, INT8）
├── 8. ONNX导出 + Runtime推理
└── 9. TensorRT加速（如果有GPU环境）

注意：每步都要验证F1和推理时间！
记录每次实验的F1+时间，找到最佳平衡点。
```

---

## Day 6：测试 + 复习

### 理论题
1. 结构化剪枝和非结构化剪枝的区别？
2. 知识蒸馏中温度T的作用？
3. PTQ和QAT的区别和适用场景？
4. ONNX相比直接PyTorch推理的优势？
5. 模型量化为INT8后，理论上推理速度提升多少倍？

### 编程题
1. 对一个训练好的ResNet18进行结构化剪枝（剪掉20% channel）
2. 实现知识蒸馏，用ResNet50教ResNet18
3. 导出ONNX模型并用ONNX Runtime推理

### ✅ 复习清单
- [ ] L1/L2非结构化剪枝
- [ ] 结构化Channel剪枝
- [ ] 知识蒸馏损失函数
- [ ] PTQ量化流程
- [ ] QAT量化流程
- [ ] ONNX导出
- [ ] ONNX Runtime推理
- [ ] TensorRT基本概念
- [ ] 推理时间测量
