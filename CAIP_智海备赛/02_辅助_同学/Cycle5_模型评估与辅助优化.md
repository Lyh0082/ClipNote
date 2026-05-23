---
tags: [CAIP, 辅助, Cycle5, 模型评估, 优化]
created: 2026-05-07
周期: 第5周
角色: 辅助（同学）
状态: 📅 未开始
---

# Cycle 5 — 模型评估 + 辅助优化

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 深入理解F1分数及其计算
- [ ] 掌握混淆矩阵分析
- [ ] 能测量和分析推理时间
- [ ] 能协助主输出进行模型优化实验

---

## 六步学习框架

### 1. 建立地图

```
辅助的评估+优化工作流
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  模型输出 → F1 计算 → 混淆矩阵 → 可视化报告 → 主输出决策
                ↑           ↑            ↑
            你分析      你找短板       你交付
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| Macro F1 | **每类等权平均**：比赛排名指标，少数类和多数类一样重要 |
| Weighted F1 | **按样本数加权**：大类别占主导 |
| 混淆矩阵 | **错误地图**：哪两个类别最容易混淆，一目了然 |
| 推理时间 | **速度指标**：F1 相同时，这是排名的决定因素 |

> **一句话本质**：辅助 = **模型的体检医生**——F1 是总分，混淆矩阵是专科报告，推理时间是体能测试。

### 3. 核心矛盾

| 矛盾对 | 具体表现 |
|--------|----------|
| **Macro vs Weighted** | Macro 对少数类敏感，Weighted 对多数类敏感——**比赛用 Macro** |
| **精度 vs 速度** | F1 高但推理慢 vs F1 稍低但推理快——需要找到平衡 |

### 4. 易混点 / 重点

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| Macro vs Weighted vs Micro F1 | 分不清 | **Macro = 比赛指标**；Weighted 看大类别；Micro = 准确率 |
| 混淆矩阵读法 | 行列搞反 | **行 = 真实类别，列 = 预测类别**；对角线 = 正确预测 |
| 推理时间测量 | 忘记预热 | 必须**先跑 10 次预热**再计时，否则包含冷启动开销 |

### 5. 压缩

```
辅助评估三件套：
  1. Macro F1 + 每类 F1（找出短板类别）
  2. 混淆矩阵 + 误分类分析（定位问题）
  3. 推理时间 + 吞吐量（对比优化前后）
```

### 6. 检索能力检查

1. Macro F1 和 Weighted F1 的计算方式有什么区别？比赛用哪个？
2. 从混淆矩阵中如何判断哪两个类别最容易混淆？
3. 测量推理时间时为什么要预热？不预热会怎样？

---

## Day 1：F1分数深入理解

### 分类任务的基本概念
```text
对于每个类别：
  真正例（TP）：预测为正，实际为正 ✓
  假正例（FP）：预测为正，实际为负 ✗
  真负例（TN）：预测为负，实际为负 ✓
  假负例（FN）：预测为负，实际为正 ✗

精确率（Precision） = TP / (TP + FP)
  预测为正的样本中，有多少是真的正类？

召回率（Recall） = TP / (TP + FN)
  实际为正的样本中，有多少被正确识别？

F1 = 2 × (P × R) / (P + R)
  精确率和召回率的调和平均
```

### 多分类F1
```python
from sklearn.metrics import f1_score, precision_score, recall_score

# 假设真实标签和预测标签
y_true = [0, 1, 2, 0, 1, 2, 0, 1, 2]  # 真实类别
y_pred = [0, 2, 1, 0, 1, 2, 1, 1, 2]  # 预测类别

# Macro F1：每个类别算F1，然后取平均（比赛用这个！）
f1_macro = f1_score(y_true, y_pred, average='macro')
print(f"Macro F1: {f1_macro:.4f}")

# Weighted F1：每个类别算F1，按样本数加权
f1_weighted = f1_score(y_true, y_pred, average='weighted')
print(f"Weighted F1: {f1_weighted:.4f}")

# Micro F1：全局计算（等于准确率）
f1_micro = f1_score(y_true, y_pred, average='micro')
print(f"Micro F1: {f1_micro:.4f}")

# 手动计算Macro F1
from sklearn.metrics import precision_recall_fscore_support
per_class = precision_recall_fscore_support(y_true, y_pred, average=None)
for i, (p, r, f, _) in enumerate(zip(*per_class)):
    print(f"类别 {i}: P={p:.3f}, R={r:.3f}, F1={f:.3f}")
```

---

## Day 2：混淆矩阵分析

```python
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
import matplotlib.pyplot as plt

def plot_confusion_matrix(y_true, y_pred, class_names=None):
    """绘制混淆矩阵"""
    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names)

    plt.xlabel('预测类别')
    plt.ylabel('真实类别')
    plt.title('混淆矩阵')
    plt.show()

    return cm

def analyze_misclassifications(y_true, y_pred, class_names):
    """分析哪些类别最容易混淆"""
    cm = confusion_matrix(y_true, y_pred)
    n_classes = len(class_names)

    print("混淆分析：")
    print("=" * 40)

    for i in range(n_classes):
        for j in range(n_classes):
            if i != j and cm[i][j] > 0:
                error_count = cm[i][j]
                total_i = cm[i].sum()
                error_rate = error_count / total_i * 100
                print(f"  {class_names[i]} → 被误认为 {class_names[j]}: "
                      f"{error_count}张 ({error_rate:.1f}%)")

    # 生成分类报告
    report = classification_report(y_true, y_pred, target_names=class_names)
    print("\n分类报告：")
    print(report)

# 使用
class_names = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy']
cm = plot_confusion_matrix(all_labels, all_preds, class_names)
analyze_misclassifications(all_labels, all_preds, class_names)

# 分析结论
"""
如果混淆矩阵显示类别A经常被误认为类别B：
1. 检查A和B在视觉上是否相似
2. 为A增加更多训练数据
3. 对A做针对性的数据增强
4. 检查标注是否有误
"""
```

---

## Day 3：推理时间测量与分析

```python
import time
import torch
import numpy as np

class InferenceBenchmark:
    """推理性能基准测试"""

    def __init__(self, model, device='cpu'):
        self.model = model
        self.device = device
        self.model.to(device)
        self.model.eval()

    def measure_latency(self, input_shape=(1, 3, 224, 224), num_runs=100):
        """测量单次推理延迟"""
        dummy_input = torch.randn(*input_shape).to(self.device)

        # 预热（让GPU/CPU进入稳定状态）
        with torch.no_grad():
            for _ in range(10):
                _ = self.model(dummy_input)

        # 正式测量
        if self.device == 'cuda':
            torch.cuda.synchronize()

        start = time.perf_counter()
        with torch.no_grad():
            for _ in range(num_runs):
                _ = self.model(dummy_input)

        if self.device == 'cuda':
            torch.cuda.synchronize()

        total_time = time.perf_counter() - start
        avg_time = total_time / num_runs * 1000  # 毫秒

        return {
            'avg_latency_ms': avg_time,
            'total_time_s': total_time,
            'runs': num_runs,
            'device': self.device,
            'input_shape': input_shape,
        }

    def measure_throughput(self, batch_sizes=[1, 8, 16, 32, 64]):
        """测量不同batch size下的吞吐量"""
        results = []

        for batch_size in batch_sizes:
            dummy_input = torch.randn(batch_size, 3, 224, 224).to(self.device)

            with torch.no_grad():
                for _ in range(10):
                    _ = self.model(dummy_input)

                if self.device == 'cuda':
                    torch.cuda.synchronize()

                start = time.perf_counter()
                for _ in range(50):
                    _ = self.model(dummy_input)

                if self.device == 'cuda':
                    torch.cuda.synchronize()

                elapsed = time.perf_counter() - start

            throughput = 50 * batch_size / elapsed  # images/sec
            latency_per_image = elapsed / (50 * batch_size) * 1000  # ms/img

            results.append({
                'batch_size': batch_size,
                'throughput': throughput,
                'latency_per_image_ms': latency_per_image
            })

        return results

    def compare_models(self, models_dict, input_shape=(1, 3, 224, 224)):
        """对比多个模型的推理性能"""
        results = []

        for name, model in models_dict.items():
            self.model = model
            self.model.to(self.device)
            self.model.eval()

            latency = self.measure_latency(input_shape)
            results.append({
                'model': name,
                'latency_ms': latency['avg_latency_ms'],
                'device': self.device
            })

        return results
```

---

## Day 4：辅助剪枝与量化实验

```python
# 辅助同学可以帮助主输出验证优化效果

def compare_optimizations(original_model, test_loader, device):
    """对比不同优化策略的效果"""
    from sklearn.metrics import f1_score
    import torch.nn.utils.prune as prune

    results = {}

    # 1. Baseline
    f1, time_ms = evaluate_model(original_model, test_loader, device)
    model_size = sum(p.numel() for p in original_model.parameters())
    results['baseline'] = {
        'f1': f1,
        'inference_time_ms': time_ms,
        'parameters': model_size,
    }

    # 2. 剪枝后
    model_pruned = copy.deepcopy(original_model)
    for name, module in model_pruned.named_modules():
        if isinstance(module, nn.Conv2d):
            prune.l1_unstructured(module, name='weight', amount=0.3)
            prune.remove(module, 'weight')

    f1_pruned, time_pruned = evaluate_model(model_pruned, test_loader, device)
    model_size_pruned = sum(p.numel() for p in model_pruned.parameters())
    results['pruned_30'] = {
        'f1': f1_pruned,
        'inference_time_ms': time_pruned,
        'parameters': model_size_pruned,
    }

    # 3. 报告
    print(f"{'Method':<15} {'F1':<8} {'Time(ms)':<10} {'Params':<10} {'Speedup':<10}")
    print("="*55)

    base_time = results['baseline']['inference_time_ms']
    for method, res in results.items():
        speedup = base_time / res['inference_time_ms']
        print(f"{method:<15} {res['f1']:.4f}  {res['inference_time_ms']:.2f}     "
              f"{res['parameters']/1e6:.1f}M    {speedup:.2f}x")

    return results

def evaluate_model(model, test_loader, device):
    """评估模型F1和推理时间"""
    model.eval()
    model.to(device)

    all_preds = []
    all_labels = []

    # 测量推理时间
    dummy = torch.randn(1, 3, 224, 224).to(device)
    with torch.no_grad():
        for _ in range(10):
            _ = model(dummy)
        if device == 'cuda':
            torch.cuda.synchronize()
        start = time.perf_counter()
        for _ in range(100):
            _ = model(dummy)
        if device == 'cuda':
            torch.cuda.synchronize()
        avg_time = (time.perf_counter() - start) / 100 * 1000

    # 评估F1
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())

    f1 = f1_score(all_labels, all_preds, average='macro')

    return f1, avg_time
```

---

## Day 5：数据可视化报告

```python
import matplotlib.pyplot as plt
import numpy as np

def create_performance_report(results_dict, save_path='performance_report.png'):
    """生成性能对比报告图"""
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    methods = list(results_dict.keys())
    f1_scores = [r['f1'] for r in results_dict.values()]
    times = [r['inference_time_ms'] for r in results_dict.values()]
    params = [r['parameters'] / 1e6 for r in results_dict.values()]

    # 1. F1对比
    colors = plt.cm.RdYlGn(np.array(f1_scores) / max(f1_scores))
    axes[0, 0].bar(methods, f1_scores, color=colors)
    axes[0, 0].set_ylabel('Macro F1')
    axes[0, 0].set_title('F1 Score 对比')
    for i, v in enumerate(f1_scores):
        axes[0, 0].text(i, v + 0.01, f'{v:.4f}', ha='center', fontsize=9)

    # 2. 推理时间对比
    axes[0, 1].bar(methods, times, color='skyblue')
    axes[0, 1].set_ylabel('推理时间 (ms)')
    axes[0, 1].set_title('单张推理时间对比')
    for i, v in enumerate(times):
        axes[0, 1].text(i, v + 0.5, f'{v:.2f}ms', ha='center', fontsize=9)

    # 3. 参数量对比
    axes[1, 0].bar(methods, params, color='lightgreen')
    axes[1, 0].set_ylabel('参数量 (M)')
    axes[1, 0].set_title('模型参数量对比')

    # 4. F1 vs 速度散点图
    axes[1, 1].scatter(times, f1_scores, s=100, c=range(len(methods)), cmap='viridis')
    for i, method in enumerate(methods):
        axes[1, 1].annotate(method, (times[i], f1_scores[i]),
                           fontsize=9, ha='center', va='bottom')
    axes[1, 1].set_xlabel('推理时间 (ms)')
    axes[1, 1].set_ylabel('F1 Score')
    axes[1, 1].set_title('F1 vs 推理速度（右上角最优）')
    axes[1, 1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.show()
    print(f"报告图已保存到 {save_path}")

# 辅助同学的输出物示例
"""
作为辅助，你每周应该向主输出提交：
1. 📊 最新实验的混淆矩阵分析
2. ⏱ 各模型推理时间对比表
3. 📈 F1 vs 速度的可视化报告
4. 🏆 推荐的最优配置
"""
```

---

## Day 6：测试 + 复习

### 理论题
1. Macro F1和Weighted F1的区别？比赛用哪个？
2. 什么是推理时间？为什么需要测量？
3. 如何从混淆矩阵判断哪些类别容易混淆？
4. 模型剪枝后为什么需要微调？

### 编程题
1. 计算一组预测结果的Macro F1和混淆矩阵
2. 实现推理时间测量函数
3. 对比一个模型剪枝前后的F1和推理时间变化

### ✅ 复习清单
- [ ] F1分数（Macro/Weighted/Micro）
- [ ] 混淆矩阵绘制
- [ ] 误分类分析
- [ ] 推理时间测量
- [ ] 吞吐量测量
- [ ] 模型优化效果对比
- [ ] 可视化报告生成
