# Day 2 · 机器人学基础

> 正逆运动学、动力学与ROS2

← [[Day 1 - 具身智能导论]] **[[📚 具身智能10天入门|目录]]** → [[Day 3 - 感知系统]]

#机器人学 #运动学 #ROS2 #动力学

---

## 🗺️ 知识地图

```mermaid
mindmap
  root((机器人学基础))
    运动学
      正运动学 FK
        DH参数法
        齐次变换矩阵
      逆运动学 IK
        解析解
        数值解 伪逆法
      雅可比矩阵
        奇异位形
    动力学
      M(q) 惯性矩阵
      C(q,q̇) 科里奥利力
      g(q) 重力项
    工具链
      ROS2
        Topic 发布/订阅
        Service 请求/响应
        Action 长时任务
      Python节点编程
```

---

## 🎯 核心问题

1. **如何从关节角度计算末端位姿？**（正运动学 FK）
2. **如何从高维末端位姿反解关节角度？**（逆运动学 IK，欠约束/过约束）
3. **机器人真正的运动阻力来自哪里？**（动力学：惯性/科氏力/重力）
4. **如何让机器人节点之间高效通信？**（ROS2 通信模型）

---

## 🔧 核心方法

| 方法 | 数学工具 | 应用场景 |
|------|---------|---------|
| DH参数法 | 齐次变换 4×4 | 正运动学 FK |
| 数值IK（伪逆法） | Jacobian伪逆 | 无解析解时的IK |
| 多起点随机搜索 | L-BFGS-B优化 | 避免IK局部最优 |
| 欧拉-拉格朗日方程 | M(q), C(q,q̇), g(q) | 动力学建模 |
| ROS2 Topic | 发布/订阅异步 | 图像、雷达流数据 |
| ROS2 Service | 请求/响应同步 | 状态查询、单次触发 |
| ROS2 Action | 目标/反馈/结果 | 导航、长时间移动 |

---

## 🔗 因果链

```
关节角度 θ
  ↓ DH变换链（正运动学）
末端位姿 T = f(θ)
  ↓ 任务需求
目标位姿 T_target
  ↓ 逆运动学 IK
关节角度 θ_target = f⁻¹(T_target)
  ↓ 雅可比 J(q)
关节速度 q̇ ↔ 末端速度 v（线性关系）
  ↓ 动力学方程
M(q)q̈ + C(q,q̇)q̇ + g(q) = τ
  ↓ ROS2 通信层
各节点（感知/规划/控制）实时协作
```

---

## ⚠️ 易混点

| 混淆对 | 区别 | 典型错误 |
|--------|------|---------|
| FK vs IK | FK 唯一解；IK 可能无解/多解/无穷解 | 认为IK和FK计算复杂度相当 |
| 解析IK vs 数值IK | 解析快但只适用于特殊构型；数值通用但慢 | 在7-DOF机械臂上强行求解析解 |
| 雅可比 vs 动力学 | 雅可比描述速度关系；动力学描述加速度与力矩 | 在动力学控制中忽略科氏力项 |
| ROS2 Topic vs Service | Topic异步流式；Service同步单次 | 用Topic做参数查询（应该用Service）|
| Rotation Matrix vs 四元数 | 矩阵9个参数有冗余；四元数4个参数无奇点 | 在插值中使用旋转矩阵（应该用四元数SLERP）|

---

## 📦 压缩：重建架构

机器人软件系统架构（ROS2为中心）：

```
┌───────┐
│   感知节点（Camera/LiDAR驱动）        │  → Topic: /camera/image_raw
├───────┤
│   感知处理节点（检测/分割/SLAM）      │  → Topic: /objects, /odom
├───────┤
│   规划节点（Global/Local Planner）    │  ← Service: /get_map
├───────┤
│   控制节点（MPC/OSC/PID）           │  → Topic: /joint_states
├───────┤
│   执行器节点（Motor/Gripper驱动）     │  ← Action: /follow_joint_trajectory
└───────┘
           ↑ all via ROS2 middleware (DDS)
```

---

## 💡 压缩：提炼本质

> **运动学的本质**：用矩阵乘法描述「关节空间」与「任务空间」的映射关系。
>
> **动力学的本质**：牛顿-欧拉方程在多刚体系统上的矩阵形式，回答「需要多大扭矩才能产生目标加速度」。
>
> **ROS2的本质**：分布式异步消息总线，解耦感知-规划-控制，让机器人系统可扩展。

**一句话记忆**：
- FK：θ → T（矩阵连乘）
- IK：T → θ（优化/解析）
- 动力学：τ = Mq̈ + Cq̇ + g（力矩 = f(加速度)）

---

## 🔗 压缩：找联系

- **Day 2 ↔ Day 5**：IK 求解器 → RL 奖励函数中的「末端误差」项
- **Day 2 ↔ Day 6**：FK 精确性 → 模仿学习中「状态重建误差」的来源
- **Day 2 ↔ Day 9**：雅可比奇异点 → 运动规划中 RRT 需要避开的「不可达区域」
- **Day 2 ↔ Day 7**：ROS2 通信延迟 → VLA 模型推理延迟对实时控制的影响

---

## 🚨 压缩：易错点

1. **DH 参数顺序错误**：α 是绕 x 轴旋转，θ 是绕 z 轴旋转，顺序搞反会导致整个 FK 错误
2. **IK 数值解陷入局部最优**：只跑一次优化容易停在坏解，务必用「多起点随机搜索」
3. **雅可比在奇异位形下秩亏**：接近奇异时 J⁺ 会算出极大关节速度，必须加阻尼（DLS）
4. **ROS2 时间戳不同步**：多个传感器话题的 timestamp 不对齐会导致「感知-控制延迟」
5. **四元数插值用 SLERP 而非 LERP**：直接对 (w,x,y,z) 做线性插值会得到非单位四元数

---

## 📖 详细内容

### 1.1 旋转矩阵（Rotation Matrix）

旋转矩阵是 3×3 正交矩阵，描述刚体在三维空间中的朝向。

$$R \cdot R^T = I, \quad \det(R) = +1$$

```python
# 旋转矩阵操作
import numpy as np
from scipy.spatial.transform import Rotation

# 欧拉角 → 旋转矩阵 (ZYX顺序，即yaw-pitch-roll)
r = Rotation.from_euler('zyx', [45, 30, 0], degrees=True)
R = r.as_matrix()
print(f"旋转矩阵形状: {R.shape}, 行列式: {np.linalg.det(R):.4f}")

# 四元数 → 旋转矩阵
r = Rotation.from_quat([0, 0, np.sin(np.pi/4), np.cos(np.pi/4)])
R = r.as_matrix()
assert np.allclose(R @ R.T, np.eye(3))   # 正交性验证
assert np.isclose(np.linalg.det(R), 1.0)  # 行列式=1
```

---

### 1.2 齐次变换矩阵（Homogeneous Transformation）

齐次变换矩阵 4×4，将旋转+平移统一表示，是机器人学中最重要的工具。

$${}^B T_A = \begin{bmatrix} {}^B R_A & {}^B p_A \\ 0 & 1 \end{bmatrix}$$

```python
def homogeneous_transform(R, p):
    T = np.eye(4)
    T[:3, :3] = R; T[:3, 3] = p.flatten(); return T

def apply_transform(T, point):
    pt = np.append(point, 1); return (T @ pt)[:3]

# 复合变换: 先绕x转45°, 再沿z平移0.3m
R_x = Rotation.from_euler('x', 45, degrees=True).as_matrix()
T_x = homogeneous_transform(R_x, np.zeros(3))
T_z = homogeneous_transform(np.eye(3), np.array([[0,0,0.3]]).T)
T = T_z @ T_x  # 注意：后变换的矩阵在左边
print(f"变换后原点: {apply_transform(T, np.array([0,0,0]))}")
```

---

### 2.1 正向运动学（FK）

给定各关节角度 θ = [θ₁, θ₂, ..., θₙ]，计算末端执行器的位置和姿态。

> [!info] 核心要点
> DH参数法（Denavit-Hartenberg）：每个关节定义一个坐标系，用4个参数（d, θ, a, α）描述相邻连杆之间的变换关系。

```python
# 3-DOF 平面机械臂 FK
from dataclasses import dataclass

@dataclass
class Link:
    length: float

def dh_transform(theta, d, a, alpha):
    ct, st = np.cos(theta), np.sin(theta)
    ca, sa = np.cos(alpha), np.sin(alpha)
    return np.array([[ct,-st*ca, st*sa, a*ct],
                               [st, ct*ca,-ct*sa, a*st],
                               [0,   sa,    ca,    d],
                               [0,   0,    0,    1]])

def planar_fk(joint_angles, lengths):
    T = np.eye(4); cum = 0
    for theta, L in zip(joint_angles, lengths):
        cum += theta; T = T @ dh_transform(cum, 0, L, 0)
    return T

# 示例: [30°, 60°, 45°]，连杆长度[0.5, 0.4, 0.3]m
angles = np.radians([30, 60, 45])
T_end = planar_fk(angles, [0.5, 0.4, 0.3])
pos = T_end[:3, 3]
print(f"末端位置: ({pos[0]:.3f}, {pos[1]:.3f}, {pos[2]:.3f}) m")
```

---

### 2.2 逆向运动学（IK）

给定末端执行器的目标位置，计算满足条件的关节角度。

```python
# 数值IK: 伪逆法 + 多起点随机搜索
from scipy.optimize import minimize

def numerical_ik(target_pos, link_lengths, n_starts=20):
    def error(angles):
        T = planar_fk(angles, link_lengths)
        return np.sum((T[:3,3] - target_pos)**2)
    best = None; best_err = 1e10
    for _ in range(n_starts):
        x0 = np.random.uniform(-np.pi, np.pi, len(link_lengths))
        res = minimize(error, x0, method='L-BFGS-B')
        if res.fun < best_err: best_err = res.fun; best = res.x
    return best, np.sqrt(best_err)

angles, err = numerical_ik(np.array([0.8,0.3,0]), [0.5,0.4,0.3])
print(f"IK解: θ={[f'{a:.2f}' for a in np.degrees(angles)]}°, 误差:{err:.5f}m")
```

---

### 2.3 雅可比矩阵（Jacobian）

雅可比矩阵 J 建立了关节空间速度与末端笛卡尔空间速度之间的关系：$v = J(q) \cdot \dot{q}$。

$$J(q) = \frac{\partial f(q)}{\partial q} \in \mathbb{R}^{6 \times n}$$

当 $\det(J) = 0$ 时，机器人处于**奇异位形**（Singularity），某些方向的运动不可实现。

---

### 3.1 动力学方程（矩阵形式）

$$M(q)\ddot{q} + C(q, \dot{q})\dot{q} + g(q) = \tau$$

M(q) 是惯性矩阵，C(q, q̇) 是科里奥利/离心力矩阵，g(q) 是重力向量，τ 是关节力矩。这是控制器设计和强化学习建模的核心。

---

### 3.2 ROS2 核心概念

| 概念 | 模式 | 典型应用 |
|------|------|---------|
| **Topic** | 异步发布/订阅 | 图像、雷达点云等大数据流 |
| **Service** | 同步请求/响应 | 查询状态、触发操作 |
| **Action** | 长时间任务+反馈 | 导航、移动等 |
| **Parameter** | 节点配置 | 参数读写 |

```python
# Python: ROS2节点示例
import rclpy; from rclpy.node import Node
from geometry_msgs.msg import Twist; from sensor_msgs.msg import Image
from cv_bridge import CvBridge

class RobotController(Node):
    def __init__(self):
        super().__init__('robot_controller')
        self.pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.sub = self.create_subscription(Image,'/camera/image_raw',self.img_cb,10)
        self.timer = self.create_timer(0.1, self.control_loop)
        self.bridge = CvBridge()

    def img_cb(self, msg):
        frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')

    def control_loop(self):
        cmd = Twist(); cmd.linear.x = 0.5; cmd.angular.z = 0.2
        self.pub.publish(cmd)

rclpy.init(); rclpy.spin(RobotController()); rclpy.shutdown()
```

---

## ✅ 今日任务

- [ ] 推导2-DOF平面机械臂的FK（手工计算 + 代码验证）
- [ ] 用数值法实现3-DOF机械臂IK并测试
- [ ] 安装ROS2 Humble并运行turtlesim演示
- [ ] 阅读ROS2官方文档，理解Topic/Service/Action的区别

---

## 相关笔记

← [[Day 1 - 具身智能导论]] **[[📚 具身智能10天入门|目录]]** → [[Day 3 - 感知系统]]
