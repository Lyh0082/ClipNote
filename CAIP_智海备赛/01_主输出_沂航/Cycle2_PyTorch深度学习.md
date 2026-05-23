---
tags: [CAIP, 主输出, Cycle2, PyTorch]
created: 2026-05-07
周期: 第2周
角色: 主输出（沂航）
状态: 📅 未开始
---

# Cycle 2 — PyTorch深度学习框架

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 理解深度学习核心概念（神经元、激活函数、损失函数、梯度下降）
- [ ] 掌握PyTorch基础操作（Tensor、autograd、设备管理）
- [ ] 能用 nn.Module 构建神经网络
- [ ] 掌握完整的训练流程（数据加载→模型→训练→评估）
- [ ] 能训练一个全连接网络完成分类任务

---

## 六步学习框架

### 1. 建立地图

```
PyTorch 训练全流程（本 Cycle 解锁的闭环）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   数据                模型                评估
┌─────────┐      ┌──────────┐      ┌──────────┐
│ DataLoader│ ──→ │ nn.Module │ ──→ │ F1/Loss  │
│ Transform │     │ Forward   │     │ Confusion│
└─────────┘      └────┬─────┘      └──────────┘
                      │
              ┌───────┴───────┐
              │  梯度下降循环   │
              │               │
              │  loss ← 前向   │
              │    ↓           │
              │  .backward()  │
              │    ↓           │
              │  optimizer.step│
              │    ↓           │
              │  zero_grad()  │
              └───────────────┘
```

> **关键认知**：本 Cycle 的核心不是"网络有多深"，而是**训练循环的五步曲**。后面所有优化都是在这个循环上做文章。

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| Tensor | **带梯度追踪的 N 维数组**（NumPy + autograd） |
| nn.Module | **参数容器 + 前向逻辑**（`__init__` 存参数，`forward` 定逻辑） |
| Loss 函数 | **模型输出和真实值的距离度量**（越高越差） |
| Optimizer | **参数更新策略**（沿梯度负方向走多远、怎么走） |
| DataLoader | **批量数据迭代器**（自动 shuffle、batch、多进程） |

> **一句话本质**：PyTorch = **自动求导 + 参数更新**。你定义前向，PyTorch 算反向——仅此而已。

### 3. 核心矛盾

| 矛盾对 | 具体表现 | 竞赛影响 |
|--------|----------|----------|
| **欠拟合 vs 过拟合** | 模型太简单 vs 太复杂 | F1 不上去 → 欠拟合；训练高验证低 → 过拟合 |
| **梯度消失 vs 梯度爆炸** | 梯度太小/太大 | 深层网络学不动（Cycle 3 ResNet 解决此问题） |
| **训练精度 vs 泛化能力** | 训练集 99% 验证集 80% | 竞赛评分看验证/测试集，训练精度高没用 |
| **速度 vs 精度** | 大模型慢但准 | 这是**整个比赛的核心矛盾** |

### 4. 因果链 / 易混点 / 重点

#### 因果链
```
数据不均衡 → 模型偏向多数类 → Macro F1 低
    ↓ 解决
加权损失 / Focal Loss / 过采样

学习率太大 → 梯度爆炸 → loss = NaN
学习率太小 → 收敛极慢 → 100 epoch 还没收敛
    ↓ 解决
学习率调度器（Cycle 4 详解）
```

#### 易混点（必须搞清！）

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| `CrossEntropyLoss` 内含 Softmax | 手动加 Softmax → 双重软化 | `CrossEntropyLoss = LogSoftmax + NLLLoss`，**输入 logits** |
| `model.train()` vs `model.eval()` | 忘了切换 | `train()` 启用 Dropout/BatchNorm 训练模式；`eval()` 关闭 |
| `requires_grad` vs `no_grad()` | 混用 | `requires_grad` 设在参数上；`no_grad()` 是上下文管理器，推理时用 |
| Tensor vs NumPy | 随意互转 | Tensor 在 GPU 上不能直接 `.numpy()`，要先 `.cpu()` |
| `.item()` vs 直接取值 | 拿到的是 Tensor 不是数 | `loss.item()` 得到 Python float；`loss` 是 0-dim Tensor |

#### 重点（划重点！）
1. **训练五步曲**：`zero_grad → forward → loss → backward → step`——这是整个比赛的脉搏
2. **CrossEntropyLoss 含 Softmax**：不要再在模型最后加 Softmax！输出 logits 直接进损失函数
3. **设备一致性**：模型和数据必须在同一设备——`model.to(device)` + `data.to(device)`

### 5. 压缩：重建架构 / 提炼本质 / 找联系 / 易错点

#### 重建架构

```
┌──────────────────────────────────────────────┐
│           PyTorch 训练 = 一个循环 + 五步曲     │
│                                               │
│  for epoch in range(N):                       │
│    for data, label in DataLoader:             │
│      ① optimizer.zero_grad()   ← 清零旧梯度   │
│      ② output = model(data)   ← 前向传播     │
│      ③ loss = criterion(...)   ← 计算损失     │
│      ④ loss.backward()         ← 反向传播     │
│      ⑤ optimizer.step()        ← 更新参数     │
│                                               │
│  评估：model.eval() + torch.no_grad()         │
└──────────────────────────────────────────────┘
```

#### 提炼本质
- **深度学习本质**：用梯度下降在高维参数空间中搜索最优解
- **PyTorch 本质**：你写前向，autograd 算反向——**动态计算图**
- **训练本质**：五步曲循环，Loss 是指南针，Optimizer 是引擎

#### 找联系（承上启下）
- Cycle 1 的 `np.array` → 本 Cycle 的 `torch.tensor`（API 几乎一致）
- Cycle 1 的 `@` 矩阵乘 → 本 Cycle 的 `nn.Linear`（就是 `y = xW^T + b`）
- 本 Cycle 的全连接网络 → Cycle 3 的 CNN（只是把 Linear 换成 Conv2d）

#### 易错点速记
```python
# ❌ 常见错误                            # ✅ 正确写法
loss = CrossEntropyLoss(softmax(output))   # loss = CrossEntropyLoss(output)  # 已含softmax
model.train()  # 推理时忘了切              # model.eval()  # 推理时必须切
x.numpy()  # x在GPU上                     # x.cpu().numpy()
loss += l  # 累加loss（Tensor图越画越大）    # loss += l.item()  # 取出float再累加
```

### 6. 检索能力检查

#### 复述题
1. PyTorch 训练循环的五步是什么？每步的作用？
2. `CrossEntropyLoss` 内部做了什么？为什么模型最后不需要 Softmax？
3. `model.train()` 和 `model.eval()` 的区别？不切换会怎样？

#### 画图题
4. 画出计算图：`y = 3x² + 2x + 1` 的前向和反向传播过程
5. 画出一个 3 层全连接网络的结构图（784→256→10），标注每层的参数形状

#### 推导/代码题
6. 手算：输入 x=2，权重 w=0.5，偏置 b=1，学习率 lr=0.1，经 ReLU 激活后 MSE Loss，一次梯度下降后 w 更新为多少？
7. 从零写一个训练循环：生成随机数据，训练 3 层 MLP，输出每 epoch 的 loss

---

## Day 1：深度学习基础理论

### 核心概念

```text
神经元: y = σ(w·x + b)
激活函数: ReLU, Sigmoid, Tanh
损失函数: CrossEntropyLoss, MSELoss
梯度下降: 沿梯度反方向更新参数
反向传播: 链式法则计算各层梯度
```

### 关键公式
- **线性层**:  output = input @ W.T + b
- **ReLU**:  f(x) = max(0, x)
- **Softmax**:  P(y=i) = e^xi / Σe^xj
- **交叉熵**:  Loss = -Σ y_i · log(p_i)

### 练习
- 手算一次前向传播（1个神经元，2个输入）
- 手算一次梯度下降更新

---

## Day 2：PyTorch Tensor 基础

```python
import torch

# 创建Tensor
x = torch.tensor([[1, 2], [3, 4]], dtype=torch.float32)
x = torch.randn(3, 4)        # 随机初始化
x = torch.zeros(3, 4)        # 全零
x = torch.ones(3, 4)         # 全一

# Tensor运算
a = torch.randn(3, 4)
b = torch.randn(3, 4)
c = a + b                    # 加法
d = a @ b.T                  # 矩阵乘法

# Tensor属性
print(x.shape)    # 形状
print(x.dtype)    # 数据类型
print(x.device)   # 设备

# 设备管理
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
x = x.to(device)

# 自动求导
x = torch.tensor([2.0], requires_grad=True)
y = x ** 2
y.backward()
print(x.grad)     # 4.0

# 不跟踪梯度
with torch.no_grad():
    y = x * 2
```

### 练习
1. 创建 3×4 随机矩阵并转到GPU
2. 验证梯度计算：y = 3x² + 2x + 1，求 dy/dx 在 x=2 处的值
3. 理解 requires_grad 和 no_grad 的作用

---

## Day 3：构建神经网络（nn.Module）

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

# 定义模型（继承nn.Module）
class SimpleNet(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super().__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.fc2(x)
        return x  # 返回logits（未经过softmax）

model = SimpleNet(784, 256, 10)
print(model)

# 查看参数
for name, param in model.named_parameters():
    print(f"{name}: {param.shape}")

# 常用层
nn.Linear(in_features, out_features)  # 全连接层
nn.Conv2d(in_c, out_c, kernel_size)   # 卷积层
nn.BatchNorm2d(num_features)          # 批归一化
nn.Dropout(p=0.5)                     # Dropout
nn.ReLU(), nn.Sigmoid()               # 激活函数
nn.Sequential(                        # 顺序容器
    nn.Linear(784, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
)
```

---

## Day 4：完整训练流程

```python
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# 1. 准备数据
X = torch.randn(1000, 784)
y = torch.randint(0, 10, (1000,))
dataset = TensorDataset(X, y)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# 2. 定义模型、损失函数、优化器
model = SimpleNet(784, 256, 10).to(device)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# 3. 训练循环
num_epochs = 10
for epoch in range(num_epochs):
    model.train()  # 训练模式
    running_loss = 0.0

    for batch_x, batch_y in dataloader:
        batch_x, batch_y = batch_x.to(device), batch_y.to(device)

        # 前向传播
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)

        # 反向传播
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        running_loss += loss.item()

    avg_loss = running_loss / len(dataloader)
    print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {avg_loss:.4f}")

# 4. 评估
model.eval()
with torch.no_grad():
    test_x = torch.randn(200, 784).to(device)
    test_y = torch.randint(0, 10, (200,)).to(device)
    outputs = model(test_x)
    _, predicted = torch.max(outputs, 1)
    accuracy = (predicted == test_y).float().mean()
    print(f"Test Accuracy: {accuracy:.4f}")
```

### 完整训练流程总结
```python
model.train()       # 启用Dropout/BatchNorm训练模式
optimizer.zero_grad()  # 清零梯度
loss.backward()     # 反向传播
optimizer.step()    # 更新参数
model.eval()        # 评估模式
torch.no_grad()     # 禁用梯度追踪
```

---

## Day 5：分类实战（完整项目）

### 用PyTorch训练MNIST手写数字识别

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# 超参数
batch_size = 64
learning_rate = 0.001
num_epochs = 5

# 数据预处理
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

# 加载数据
train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_dataset = datasets.MNIST('./data', train=False, transform=transform)
train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

# 定义CNN网络
class CNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, 1)
        self.conv2 = nn.Conv2d(32, 64, 3, 1)
        self.fc1 = nn.Linear(1600, 128)
        self.fc2 = nn.Linear(128, 10)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = F.max_pool2d(x, 2)
        x = F.relu(self.conv2(x))
        x = F.max_pool2d(x, 2)
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x

model = CNN().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=learning_rate)

# 训练
for epoch in range(num_epochs):
    model.train()
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        output = model(images)
        loss = criterion(output, labels)
        loss.backward()
        optimizer.step()
    print(f"Epoch {epoch+1} completed")

# 测试
model.eval()
correct = 0
with torch.no_grad():
    for images, labels in test_loader:
        images, labels = images.to(device), labels.to(device)
        output = model(images)
        pred = output.argmax(dim=1)
        correct += (pred == labels).sum().item()
print(f"Accuracy: {100 * correct / len(test_dataset):.2f}%")
```

---

## Day 6：测试 + 复习

### 理论题
1. PyTorch中Tensor和NumPy数组的区别？
2. requires_grad=True 的作用是什么？
3. model.train() 和 model.eval() 的区别？
4. CrossEntropyLoss 内部是否包含 Softmax？
5. 梯度下降中 learning rate 太大会怎样？太小会怎样？

### 编程题
1. 用PyTorch实现一个 3层全连接网络（784→512→256→10）
2. 实现一个完整的训练循环（含验证）
3. 修改MNIST代码，增加验证集准确率打印

### ✅ 复习清单
- [ ] Tensor创建和运算
- [ ] 自动求导（autograd）
- [ ] nn.Module模型构建
- [ ] 损失函数选择
- [ ] 优化器使用
- [ ] DataLoader数据加载
- [ ] 完整训练流程
- [ ] 模型保存与加载
