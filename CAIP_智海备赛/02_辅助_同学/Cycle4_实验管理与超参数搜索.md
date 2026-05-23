---
tags: [CAIP, 辅助, Cycle4, 实验管理, 超参数]
created: 2026-05-07
周期: 第4周
角色: 辅助（同学）
状态: 📅 未开始
---

# Cycle 4 — 实验管理 + 超参数搜索

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 学会用TensorBoard管理和对比实验
- [ ] 掌握Grid Search和Random Search超参数搜索
- [ ] 能用Excel/CSV记录实验数据
- [ ] 能生成实验分析报告

---

## 六步学习框架

### 1. 建立地图

```
辅助的实验管理工作流
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  实验执行 → 数据记录 → 结果分析 → 报告输出
     ↑           ↑           ↑          ↑
  主输出训练  你记录CSV  你画图表   你交付给主输出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| 实验记录 | **决策日志**：每个配置 → 每个结果，可追溯 |
| Grid Search | **地毯式搜索**：穷举所有组合，慢但全面 |
| Random Search | **随机撒点**：随机采样，快且通常够用 |
| 实验报告 | **信息压缩**：把 50 次实验压缩成 1 张图 + 3 条结论 |

> **一句话本质**：辅助 = **实验的记录员 + 分析师 + 报告员**——让主输出专注训练，不用管记录。

### 3. 核心矛盾

| 矛盾对 | 具体表现 |
|--------|----------|
| **搜索空间 vs 时间** | Grid Search 组合爆炸，10 个参数各 3 值 = 59049 组 |
| **记录细致 vs 记录负担** | 记太多太累，记太少没用 |

### 4. 易混点 / 重点

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| Grid vs Random | 以为 Grid 更好 | **Random Search 多数情况更高效**（Bergstra 2012 证明） |
| lr 采样方式 | 均匀采样 | 学习率应该**对数均匀采样**：`10**random.uniform(-4, -2)` |
| 实验记录字段 | 随意记 | 必须包含：模型名、lr、batch_size、optimizer、augmentation、F1、推理时间 |

### 5. 压缩

```
辅助实验管理三件套：
  1. CSV 记录每次实验的配置+结果（自动追加）
  2. Random Search 优先，Grid Search 在最优区域精细搜索
  3. Matplotlib 可视化：lr-F1 散点图 + 热力图 + 排名表
```

### 6. 检索能力检查

1. Grid Search 和 Random Search 各自的优缺点？
2. 为什么学习率要用对数均匀采样而不是均匀采样？
3. 写出实验记录必须包含的 7 个字段

---

## Day 1：实验管理基础

### 为什么需要实验管理？
```text
比赛中你会做很多次实验，每次改一个参数。
如果不记录，你很快会忘记：
- 这个模型用了什么学习率？
- 这个结果对应哪次实验？
- 最好的F1是哪个配置？

实验管理 = 记录每一次实验的所有信息
```

### 用CSV记录实验
```python
import pandas as pd
import json
from datetime import datetime

class ExperimentTracker:
    """简单的实验记录器"""
    def __init__(self, csv_path='experiments.csv'):
        self.csv_path = csv_path
        # 如果文件不存在，创建它
        try:
            self.df = pd.read_csv(csv_path)
        except FileNotFoundError:
            self.df = pd.DataFrame()

    def add_experiment(self, config, metrics):
        """添加一次实验记录"""
        record = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'experiment_id': f"exp_{len(self.df) + 1:03d}",
        }
        # 合并配置和指标
        record.update(config)
        record.update(metrics)

        new_row = pd.DataFrame([record])
        self.df = pd.concat([self.df, new_row], ignore_index=True)
        self.df.to_csv(self.csv_path, index=False)
        return record['experiment_id']

    def get_best(self, metric='f1'):
        """获取最好的实验"""
        if metric not in self.df.columns:
            return None
        best_idx = self.df[metric].idxmax()
        return self.df.iloc[best_idx].to_dict()

    def compare(self, col1, col2):
        """对比两列的关系"""
        return self.df[[col1, col2]].corr()

# 使用示例
tracker = ExperimentTracker()

# 每次实验后调用
tracker.add_experiment(
    config={
        'model': 'resnet18',
        'lr': 0.001,
        'batch_size': 32,
        'optimizer': 'Adam',
        'augmentation': 'basic',
    },
    metrics={
        'f1': 0.893,
        'inference_time_ms': 12.5,
        'accuracy': 0.912,
    }
)
```

---

## Day 2：Grid Search 网格搜索

```python
import itertools
import time

def grid_search(model_class, train_loader, val_loader, param_grid, num_epochs=10):
    """网格搜索超参数"""
    results = []

    # 生成所有参数组合
    keys = param_grid.keys()
    values = param_grid.values()
    combinations = list(itertools.product(*values))

    print(f"共 {len(combinations)} 组参数组合")

    for i, combination in enumerate(combinations):
        params = dict(zip(keys, combination))
        print(f"\n[{i+1}/{len(combinations)}] 测试: {params}")

        # 初始化模型
        model = model_class()

        # 设置优化器
        optimizer = torch.optim.Adam(
            model.parameters(),
            lr=params['lr'],
            weight_decay=params.get('weight_decay', 0)
        )

        # 训练
        for epoch in range(num_epochs):
            train_one_epoch(model, train_loader, ..., optimizer)

        # 评估
        f1 = evaluate(model, val_loader)

        results.append({
            **params,
            'f1': f1,
            'experiment_id': f"grid_{i:03d}"
        })

        print(f"  F1: {f1:.4f}")

    # 转换为DataFrame分析
    results_df = pd.DataFrame(results)
    results_df.to_csv('grid_search_results.csv', index=False)

    # 找出最优
    best = results_df.loc[results_df['f1'].idxmax()]
    print("\n最优参数:")
    print(best)

    return results_df

# 使用
param_grid = {
    'lr': [0.01, 0.001, 0.0001],
    'weight_decay': [0, 1e-4, 1e-3],
    'batch_size': [16, 32],  # 注意：batch_size影响DataLoader
}
# results = grid_search(MyModel, train_loader, val_loader, param_grid)
```

---

## Day 3：Random Search + Bayesian基础

### Random Search（随机搜索）
```python
import random

def random_search(model_class, train_loader, val_loader, n_trials=20):
    """随机搜索"""
    results = []

    for i in range(n_trials):
        # 从分布中随机采样参数
        params = {
            'lr': 10 ** random.uniform(-4, -2),        # 1e-4 ~ 1e-2 对数均匀
            'weight_decay': 10 ** random.uniform(-5, -3),  # 1e-5 ~ 1e-3
            'optimizer': random.choice(['Adam', 'SGD']),
            'momentum': random.uniform(0.8, 0.99) if random.random() > 0.5 else 0,
        }

        print(f"\n[{i+1}/{n_trials}] {params}")

        # 训练和评估...
        f1 = train_and_eval(model_class, params, train_loader, val_loader)

        results.append({**params, 'f1': f1})

    return pd.DataFrame(results)

# Grid Search vs Random Search对比
"""
Grid Search: 遍历所有组合，彻底但耗时
  优点：全面，不遗漏
  缺点：组合数随参数数量指数增长

Random Search: 随机采样，高效
  优点：在较少试验次数下找到好参数的概率更高
  缺点：可能错过最优参数组合
  经验：Random Search在多数情况下效果更好！

经验：先用Random Search探索，再用Grid Search在最优区域精细搜索
"""
```

---

## Day 4：实验分析与报告

### 分析实验数据
```python
import matplotlib.pyplot as plt
import seaborn as sns

# 1. 查看不同lr的效果
def plot_lr_comparison(results_df):
    plt.figure(figsize=(10, 6))
    for lr in results_df['lr'].unique():
        subset = results_df[results_df['lr'] == lr]
        plt.scatter([lr]*len(subset), subset['f1'], label=f'lr={lr}', s=100)

    plt.xscale('log')
    plt.xlabel('Learning Rate')
    plt.ylabel('F1 Score')
    plt.title('学习率 vs F1')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.show()

# 2. 热力图：两个参数的交互效果
def plot_heatmap(results_df, x_param, y_param):
    pivot = results_df.pivot_table(
        values='f1', index=y_param, columns=x_param, aggfunc='mean'
    )
    plt.figure(figsize=(8, 6))
    sns.heatmap(pivot, annot=True, fmt='.4f', cmap='YlOrRd')
    plt.title(f'{x_param} vs {y_param} 的F1热力图')
    plt.show()

# 3. 生成实验报告
def generate_report(results_df, output_path='experiment_report.md'):
    """生成Markdown格式的实验报告"""
    best = results_df.loc[results_df['f1'].idxmax()]

    report = f"""# 实验报告

## 最优配置
{best.to_dict()}

## 实验概况
- 总实验数: {len(results_df)}
- 最高F1: {results_df['f1'].max():.4f}
- 最低F1: {results_df['f1'].min():.4f}
- 平均F1: {results_df['f1'].mean():.4f}

## 所有实验
"""
    for _, row in results_df.iterrows():
        report += f"- [{row['experiment_id']}] F1={row['f1']:.4f}, lr={row['lr']}, ...\n"

    with open(output_path, 'w') as f:
        f.write(report)

    print(f"报告已保存到 {output_path}")
```

---

## Day 5：自动化实验管理实践

```python
# 完整的实验流水线

def run_experiment_pipeline(
    config,
    data_config,
    model_class,
    tracker
):
    """完整的实验运行流水线"""
    print(f"\n{'='*50}")
    print(f"实验: {config['name']}")
    print(f"{'='*50}")

    # 1. 设置随机种子（保证可复现）
    torch.manual_seed(config.get('seed', 42))
    np.random.seed(config.get('seed', 42))

    # 2. 准备数据
    train_loader, val_loader = get_dataloaders(data_config)
    print(f"训练样本: {len(train_loader.dataset)}")
    print(f"验证样本: {len(val_loader.dataset)}")

    # 3. 初始化模型
    model = model_class(num_classes=data_config['num_classes'])
    print(f"模型: {config['model_name']}")
    print(f"参数量: {sum(p.numel() for p in model.parameters()):,}")

    # 4. 训练
    start_time = time.time()
    best_f1 = train_model(model, train_loader, val_loader, config)
    train_time = time.time() - start_time

    # 5. 测量推理时间
    inference_time = measure_inference_time(model)

    # 6. 记录结果
    exp_id = tracker.add_experiment(
        config={
            **config,
            'train_time_min': train_time / 60,
        },
        metrics={
            'f1': best_f1,
            'inference_time_ms': inference_time,
        }
    )

    # 7. 保存模型
    torch.save({
        'config': config,
        'model_state_dict': model.state_dict(),
        'f1': best_f1,
    }, f'models/{exp_id}.pth')

    print(f"✓ F1={best_f1:.4f}, 推理时间={inference_time:.2f}ms")
    return exp_id, best_f1, inference_time

# 辅助同学可以这样支持主输出：
# 1. 准备好数据加载配置
# 2. 运行多种超参数组合的实验
# 3. 整理实验结果给主输出分析
# 4. 保存最优模型
```

---

## Day 6：测试 + 复习

### 理论题
1. Grid Search和Random Search的优缺点？
2. 为什么要记录每个实验的配置和结果？
3. 学习率为什么常用对数均匀采样（log-uniform）？
4. TensorBoard中如何对比多个实验？

### 编程题
1. 实现一个简单的实验记录器（CSV输出）
2. 对学习率做Grid Search，找出最优三个值
3. 用Matplotlib画出学习率和F1的关系图

### ✅ 复习清单
- [ ] 实验记录方法（CSV/Excel）
- [ ] Grid Search实现
- [ ] Random Search实现
- [ ] 实验结果可视化
- [ ] 实验报告生成
- [ ] 可复现性设置
- [ ] 最优模型保存
