---
tags: [CAIP, 辅助, Cycle6, 冲刺, 实战]
created: 2026-05-07
周期: 第6周
角色: 辅助（同学）
状态: 📅 未开始
---

# Cycle 6 — 综合实战支持

> ⏱ 5天学习 | 📝 1天测试复习 | 😴 1天休息

## 学习目标

- [ ] 能独立搭建数据Pipeline
- [ ] 能配合主输出进行实验管理
- [ ] 掌握团队协作工具使用
- [ ] 完成备赛文档沉淀

---

## 六步学习框架

### 1. 建立地图

```
辅助的冲刺工作流
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  数据Pipeline → 实验管理 → 代码协作 → 文档沉淀
       ↑             ↑          ↑          ↑
    你搭建       你维护      你配合     你交付
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. 建立统一抽象

| 概念 | 统一抽象 |
|------|----------|
| 数据 Pipeline | **标准化流水线**：原始数据 → 划分 → 增强 → 可加载 |
| Git 协作 | **代码版本管理**：不丢代码、不覆盖、可回退 |
| 文档沉淀 | **经验固化**：把踩过的坑变成后来人的路标 |
| 应急方案 | **保险策略**：Plan A/B/C，总有一个能交 |

> **一句话本质**：辅助的最终目标是**让主输出 100% 精力在训练和优化上**，其余全由你兜底。

### 3. 核心矛盾

| 矛盾对 | 具体表现 |
|--------|----------|
| **分工 vs 协作** | 各做各的 → 信息不同步 → 重复工作或遗漏 |
| **完美 vs 够用** | 追求最优方案 → 来不及提交 |

### 4. 易混点 / 重点

| 易混点 | 陷阱 | 正确理解 |
|--------|------|----------|
| Git merge vs rebase | 搞混 | 团队用 **merge** 更安全，rebase 会改历史 |
| 数据划分随机性 | 每次划分不同 | 必须**固定 random_seed**，保证可复现 |
| 应急方案选择 | 以为只用最好的 | **先交最稳的，再交最优的**——确保有分 |

### 5. 压缩

```
辅助冲刺三件套：
  1. 数据 Pipeline 一键跑通（原始→训练集/验证集）
  2. 最终检查清单（数据/模型/实验/优化/提交 五大类）
  3. 三套方案就绪（高精度/平衡/极速），按平台情况选择
```

### 6. 检索能力检查

1. 数据划分时为什么要固定随机种子？
2. 比赛前应该准备几套方案？各自定位是什么？
3. 列出最终提交前的 5 项检查要点

---

## Day 1：数据Pipeline搭建

```python
# 完整的数据处理Pipeline
# 辅助同学的职责：确保数据准备好，主输出可以直接训练

import os
import shutil
import random
from sklearn.model_selection import train_test_split

class DataPipeline:
    """数据预处理Pipeline"""

    def __init__(self, raw_data_dir, output_dir):
        self.raw_data_dir = raw_data_dir
        self.output_dir = output_dir
        self.train_dir = os.path.join(output_dir, 'train')
        self.val_dir = os.path.join(output_dir, 'val')

    def split_dataset(self, val_ratio=0.2, random_seed=42):
        """划分训练集和验证集"""
        random.seed(random_seed)

        # 创建输出目录
        os.makedirs(self.train_dir, exist_ok=True)
        os.makedirs(self.val_dir, exist_ok=True)

        stats = {}

        for class_name in os.listdir(self.raw_data_dir):
            class_path = os.path.join(self.raw_data_dir, class_name)
            if not os.path.isdir(class_path):
                continue

            images = os.listdir(class_path)
            random.shuffle(images)

            # 划分
            split_idx = int(len(images) * (1 - val_ratio))
            train_images = images[:split_idx]
            val_images = images[split_idx:]

            # 创建类别目录
            os.makedirs(os.path.join(self.train_dir, class_name), exist_ok=True)
            os.makedirs(os.path.join(self.val_dir, class_name), exist_ok=True)

            # 复制文件
            for img in train_images:
                shutil.copy2(
                    os.path.join(class_path, img),
                    os.path.join(self.train_dir, class_name, img)
                )
            for img in val_images:
                shutil.copy2(
                    os.path.join(class_path, img),
                    os.path.join(self.val_dir, class_name, img)
                )

            stats[class_name] = {
                'total': len(images),
                'train': len(train_images),
                'val': len(val_images),
            }

        # 输出统计
        print("数据集划分完成：")
        print(f"{'类别':<15} {'总数':<8} {'训练':<8} {'验证':<8}")
        print("-" * 40)
        for cls, s in stats.items():
            print(f"{cls:<15} {s['total']:<8} {s['train']:<8} {s['val']:<8}")

        return stats

    def check_data_integrity(self):
        """检查数据完整性"""
        report = {}
        for split in ['train', 'val']:
            split_dir = os.path.join(self.output_dir, split)
            report[split] = {}
            for class_name in os.listdir(split_dir):
                class_path = os.path.join(split_dir, class_name)
                if os.path.isdir(class_path):
                    report[split][class_name] = len(os.listdir(class_path))
        return report
```

---

## Day 2：团队协作与代码管理

### Git协作流程
```bash
# 1. 初始化仓库
git init
git add .
git commit -m "init: CAIP智海备赛项目"

# 2. 创建分支
git checkout -b main_output    # 主输出的代码
git checkout -b assistant      # 辅助的代码

# 3. 日常操作
git add .
git commit -m "feat: 添加数据增强pipeline"
git push origin assistant

# 4. 合并
git checkout main
git merge assistant

# .gitignore 模板
"""
__pycache__/
*.pyc
*.pth
*.onnx
*.log
runs/
data/raw/
data/train/
data/val/
models/
.ipynb_checkpoints/
"""
```

### 团队协作建议
```text
📁 项目目录结构建议：
CAIP智海备赛/
├── data/                  # 数据（不上传Git）
│   ├── raw/              # 原始数据
│   ├── train/            # 训练集
│   └── val/              # 验证集
├── models/                # 模型文件（不上传Git）
├── notebooks/             # Jupyter Notebook
│   ├── 01_data_explore.ipynb   # 数据探索
│   ├── 02_baseline.ipynb       # Baseline
│   └── 03_optimization.ipynb   # 优化实验
├── src/                   # Python源码
│   ├── data/             # 数据处理
│   ├── models/           # 模型定义
│   └── utils/            # 工具函数
├── experiments/           # 实验结果
│   └── experiment_log.csv
├── configs/               # 配置文件
└── runs/                  # TensorBoard日志
```

---

## Day 3：最终实验冲刺

### 最终实验清单
```python
# 辅助同学负责的最终检查清单

final_checklist = {
    "数据": [
        "数据集划分是否正确？",
        "类别分布是否均衡？",
        "数据增强是否应用到训练集？",
        "验证集是否只做基本预处理？",
    ],
    "模型": [
        "Baseline模型是否跑通？",
        "最优模型是否已确定？",
        "备用模型是否准备？",
    ],
    "实验": [
        "所有实验记录是否汇总？",
        "最优配置是否有记录？",
        "F1和推理时间数据是否完整？",
    ],
    "优化": [
        "是否尝试了数据增强优化？",
        "是否尝试了模型剪枝？",
        "是否尝试了模型量化？",
        "是否导出ONNX测试？",
        "推理时间是否在限制内？",
    ],
    "提交": [
        "代码是否能在平台运行？",
        "输出格式是否符合要求？",
        "模型文件是否在限制内？",
        "是否有紧急预案？",
    ],
}

def print_checklist(checklist):
    for category, items in checklist.items():
        print(f"\n[{category}]")
        for item in items:
            print(f"  [ ] {item}")

print_checklist(final_checklist)
```

---

## Day 4：文档沉淀与笔记整理

### 实验总结模板
```markdown
# 实验总结

## 参赛信息
- 团队：主输出（沂航）+ 辅助（同学）
- 赛道：智海算法调优
- 任务：天气图像分类

## 最终方案
- 模型：EfficientNet-B0
- 数据增强：Albumentations (Flip+Rotation+ColorJitter+CoarseDropout)
- 优化器：AdamW (lr=0.001)
- 调度器：CosineAnnealingLR
- 优化策略：结构化剪枝30% + PTQ量化 + ONNX导出
- 最终 F1：待填写
- 推理时间：待填写

## 实验过程
### 最佳模型演进
| 版本 | 模型 | 数据增强 | F1 | 推理时间(ms) |
|------|------|----------|-----|-------------|
| V1 | ResNet18 | 基础 | 0.xx | xx.xx |
| V2 | EfficientNet-B0 | 中等 | 0.xx | xx.xx |
| V3 | +MixUp | 强 | 0.xx | xx.xx |
| V4 | +剪枝30% | 强 | 0.xx | xx.xx |
| V5 | +量化+ONNX | 强 | 0.xx | xx.xx |

### 关键发现
1. ...

## 比赛Tips
1. ...
```

---

## Day 5：模拟比赛 + 最终准备

### 省赛当日Checklist
```text
□ 提前30分钟登录智海Mo平台
□ 确认平台环境（PyTorch版本、依赖库）
□ 上传训练好的模型
□ 提交推理代码
□ 确认输出格式正确
□ 第一次提交（安全版）
□ 分析结果，如有问题及时调整
□ 第二次提交（优化版）
□ 记录所有参赛信息
```

### 应急方案
```python
# 如果主方案失败，准备备用方案

backup_plans = {
    "plan_A": {
        "description": "首选方案：EfficientNet-B0 + 增强 + 剪枝 + ONNX",
        "model_path": "models/best_efficientnet.pth",
        "inference_script": "inference_onnx.py",
        "expected_f1": 0.90,
        "expected_time_ms": 5.0,
    },
    "plan_B": {
        "description": "备用方案：ResNet18 + 基本增强 + ONNX",
        "model_path": "models/backup_resnet18.pth",
        "inference_script": "inference_backup.py",
        "expected_f1": 0.87,
        "expected_time_ms": 3.0,
    },
    "plan_C": {
        "description": "紧急方案：MobileNetV3 + 最小预处理",
        "model_path": "models/emergency_mobilenet.pth",
        "inference_script": "inference_emergency.py",
        "expected_f1": 0.85,
        "expected_time_ms": 1.5,
    }
}
```

---

## Day 6：综合测试 + 最终复习

### 综合测试
1. 完整运行一次数据预处理 → 训练 → 推理 → 提交的流程
2. 生成最终实验报告
3. 确认所有代码可以在平台运行

### 最终复习清单
- [ ] Python数据处理（NumPy, Pandas）
- [ ] 图像文件操作（PIL, OpenCV）
- [ ] 数据增强（torchvision, Albumentations）
- [ ] 数据可视化（Matplotlib）
- [ ] TensorBoard训练监控
- [ ] 实验记录与管理
- [ ] 超参数搜索（Grid/Random）
- [ ] F1分数计算与分析
- [ ] 混淆矩阵分析
- [ ] 推理时间测量
- [ ] 实验结果对比报告
- [ ] 团队协作与Git使用
- [ ] 最终文档沉淀
