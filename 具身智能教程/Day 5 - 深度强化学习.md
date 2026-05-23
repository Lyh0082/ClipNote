# Day 5 · 深度强化学习

> MDP、PPO、SAC与机器人控制

← [[Day 4 - 深度学习基础]] **[[📚 具身智能10天入门|目录]]** → [[Day 6 - 模仿学习]]

#强化学习 #PPO #SAC #DRL

---

## 🗺️ 知识地图

```mermaid
mindmap
  root((深度强化学习))
    MDP 建模
      状态空间 S
      动作空间 A
      奖励函数 R
      折扣因子 γ
    价值函数
      Vπ(s) 状态价值
      Qπ(s,a) 动作价值
      Aπ(s,a) 优势函数
    算法路线
      Value-Based DQN
      Policy Gradient PPO/SAC
      Actor-Critic
    机器人应用
      运动控制
      抓取
      导航
```

---

## 🎯 核心问题

1. **如何形式化具身任务？**（MDP 四元组设计）
2. **连续动作空间如何处理？**（PPO  vs SAC 的选择）
3. **奖励稀疏怎么办？**（Reward Shaping / Curriculum Learning）
4. **Sim2Real 在 RL 中如何解决？**（域随机化 / 系统辨识）

---

## 🔧 核心方法

| 方法 | 核心思想 | 适用场景 |
|------|---------|---------|
| DQN | Q-network + Target network + Experience Replay | 离散动作 |
| PPO | Clipped surrogate objective，策略更新稳定 | 连续动作，最常用 |
| SAC | 最大熵 RL，探索性强 | 连续控制，样本效率要求高 |
| GAE-λ | 平衡偏差与方差的优势估计 | 所有 Actor-Critic 方法 |
| HER | 用"达成状态"作为额外目标，解决稀疏奖励 | 目标条件任务（抓取、推物）|

---

## 🔗 因果链

```
环境动力学 P(s'|s,a)
  ↓ 交互采样
轨迹 τ = {(s_t, a_t, r_t, s_{t+1})}
  ↓ 优势估计 GAE-λ
Â_t = Σ_{l=0} (γλ)^l δ_{t+l}， δ_t = r_t + γV(s_{t+1}) - V(s_t)
  ↓ 策略优化（PPO Clip）
L^{CLIP}(θ) = 𝔼[min(r_t(θ)Â_t, clip(r_t, 1-ε, 1+ε)Â_t)]
  ↓ 策略迭代
π_θ 改进 → 新轨迹采样 → 循环
```

---

## ⚠️ 易混点

| 混淆对 | 区别 | 典型错误 |
|--------|------|---------|
| On-Policy vs Off-Policy | On-Policy 只用当前策略数据；Off-Policy 可用旧数据 | 在 PPO 中用 Replay Buffer（应该用 On-Policy）|
| PPO vs TRPO | PPO 用 Clip 近似约束；TRPO 用 KL 约束+共轭梯度 | 认为 PPO 比 TRPO 更难调参（实际相反）|
| SAC 熵系数 α | 自动调节：α 大=更多探索；α 小=利用已有策略 | 固定 α 且设太大，导致策略不收敛 |
| Q-learning vs Policy Gradient | Q-learning 学 Q 值；Policy Gradient 直接优化策略 | 在连续动作空间用 DQN（应该用 SAC/PPO）|
| GAE λ=0 vs λ=1 | λ=0 = TD 误差（高偏差低方差）；λ=1 = MC 回报（低偏差高方差） | 盲目设 λ=0.95 而不做消融实验 |

---

## 📦 压缩：重建架构

RL 算法选型决策树：

```
具身任务
  ├─ 动作空间离散？
  │    └─ 是 → DQN / Double DQN
  ├─ 需要极高样本效率？
  │    └─ 是 → SAC（最大熵，探索性强）
  ├─ 需要训练稳定性？
  │    └─ 是 → PPO（Clip 目标，工业最常用）
  └─ 稀疏奖励严重？
       └─ 是 → HER + (PPO/SAC)
```

---

## 💡 压缩：提炼本质

> **RL 的本质**：在「探索」与「利用」之间找平衡，通过试错最大化累积回报。

**三个核心方程**：

1. **贝尔曼方程**：$V^\pi(s) = 𝔼_{a∼π}[r(s,a) + γ V^\pi(s')]$
2. **策略梯度定理**：$\nabla_θ J(θ) = 𝔼[\nabla_θ \log π_θ(a|s) · A^π(s,a)]$
3. **PPO Clip 目标**：$L^{CLIP} = min(r_θ Â, clip(r_θ, 1-ε, 1+ε) Â)$

**记忆口诀**：
- 价值函数 = 「这个地方好不好」
- 优势函数 = 「这个动作比平均好多少」
- PPO Clip = 「步子别迈太大」

---

## 🔗 压缩：找联系

- **Day 5 ↔ Day 2**：RL 动作空间设计 → 机器人关节角度范围（IK 解空间）
- **Day 5 ↔ Day 4**：策略网络 = MLP/CNN/Transformer，用深度学习训练
- **Day 5 ↔ Day 6**：RL 样本效率低 → 模仿学习用专家数据加速
- **Day 5 ↔ Day 8**：仿真环境 = RL 训练场，Isaac Gym 千环境并行
- **Day 5 ↔ Day 9**：RL 训练的运动策略 → 全身协调控制

---

## 🚨 压缩：易错点

1. **奖励函数设计灾难**：奖励太稠密 → 策略走捷径（Shortcut）；太稀疏 → 学不会
2. **观测空间归一化**：关节角度/速度量纲不同，必须归一化到 [-1, 1]
3. **PPO 中旧策略未及时更新**：每轮更新后必须 `actor_old.load_state_dict(actor.state_dict())`
4. **SAC 的 Q 网络过估计**：用 Double Q-learning（两个 Q 网络取 min）
5. **忽略 Episode 长度上限**：机器人任务超时也算失败，奖励设计要包含时间惩罚

---

## 📖 详细内容

### 1.1 马尔可夫决策过程（MDP）

RL 问题被建模为 MDP：智能体在状态空间 S 中，根据策略 π(a|s) 选择动作 a，进入下一状态 s'，获得奖励 r(s,a,s')。

$$G_t = R_{t+1} + γ·R_{t+2} + γ^2·R_{t+3} + ··· = Σ_{k=0}^∞ γ^k R_{t+k+1}$$

γ ∈ [0,1] 是折扣因子，控制即时奖励与长远奖励的权衡。

- **V^π(s)**（价值函数）：按策略 π 的期望累积折扣奖励
- **Q^π(s,a)**（动作价值）：选动作 a 后的期望累积折扣奖励
- **A^π(s,a)**（优势函数）：A = Q - V，衡量动作 a 的相对优势

> [!info] 核心要点
> 两类核心算法路线：
> ① **Value-Based**：学习 Q(s,a)，用 ε-greedy 选动作。代表：DQN、Double DQN、Dueling DQN。适合离散动作空间。
> ② **Policy Gradient**：直接参数化 π_θ(a|s)，用梯度上升最大化期望回报。代表：REINFORCE、PPO、SAC。适合连续动作空间（机器人控制）。

---

### 2.1 PPO 裁剪目标

$$L^{CLIP}(θ) = 𝔼_t [ \min( r_t(θ)·Â_t, \ clip(r_t, 1-ε, 1+ε)·Â_t ) ]$$

$r_t(θ) = π_θ / π_{θ_{old}}$ 是概率比，clip 操作防止策略更新过大，这是 PPO 训练稳定的关键。

```python
# PPO Actor-Critic 核心实现
import torch; import torch.nn as nn; import torch.nn.functional as F; import numpy as np

class PPOAgent:
    def __init__(self, state_dim, action_dim, hidden=256, lr=3e-4, gamma=0.99, lam=0.95, clip_eps=0.2):
        self.gamma, self.lam, self.clip_eps = gamma, lam, clip_eps
        self.actor  = self._net(state_dim, action_dim)
        self.critic = self._net(state_dim, 1)
        self.actor_old = self._net(state_dim, action_dim)
        self.actor_old.load_state_dict(self.actor.state_dict())
        self.opt = torch.optim.Adam(
            list(self.actor.parameters()) + list(self.critic.parameters()), lr=lr)

    def _net(self, in_d, out_d):
        return nn.Sequential(
            nn.Linear(in_d, hidden), nn.Tanh(),
            nn.Linear(hidden, hidden), nn.Tanh(),
            nn.Linear(hidden, out_d), nn.Tanh())

    def get_action(self, state):
        with torch.no_grad():
            mu, log_std = self.actor_old(torch.FloatTensor(state))
            std = log_std.exp()
            dist = torch.distributions.Normal(mu, std)
            a = dist.sample()
            logp = dist.log_prob(a).sum(dim=-1)
        return a.numpy(), logp.numpy(), mu.numpy()

    def compute_gae(self, rewards, values, dones):
        advantages = np.zeros_like(rewards); last_adv = 0
        for t in reversed(range(len(rewards)-1)):
            delta = rewards[t] + self.gamma * values[t+1] * (1-dones[t]) - values[t]
            advantages[t] = delta + self.gamma * self.lam * (1-dones[t]) * last_adv
            last_adv = advantages[t]
        returns = advantages + values[:-1]
        return returns, advantages

    def update(self, buffer, k_epochs=10):
        states, actions, old_logps, returns, advantages = buffer
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)
        for _ in range(k_epochs):
            mu, log_std = self.actor(states)
            std = log_std.exp()
            dist = torch.distributions.Normal(mu, std)
            logps = dist.log_prob(actions).sum(dim=-1)
            ratio = (logps - old_logps).exp()
            surr1 = ratio * advantages
            surr2 = ratio.clamp(1-self.clip_eps, 1+self.clip_eps) * advantages
            actor_loss  = -torch.min(surr1, surr2).mean()
            critic_loss = F.mse_loss(self.critic(states).squeeze(), returns)
            self.opt.zero_grad()
            (actor_loss + 0.5 * critic_loss).backward()
            self.opt.step()
        self.actor_old.load_state_dict(self.actor.state_dict())

print("PPO 核心框架就绪！配合 stable-baselines3 可快速部署。")
```

---

### 2.2 SAC（Soft Actor-Critic）

SAC 在优化累积回报的同时最大化策略熵，鼓励探索，样本效率优于 PPO。

```python
# 使用 stable-baselines3 快速训练 SAC
from stable_baselines3 import SAC
import gymnasium as gym

class RobotReachEnv(gym.Env):
    def __init__(self):
        super().__init__()
        self.observation_space = gym.spaces.Box(-1, 1, shape=(18,))
        self.action_space      = gym.spaces.Box(-1, 1, shape=(7,))
    def step(self, action):
        obs = np.random.randn(18).astype(np.float32)
        reward = -np.linalg.norm(obs[:3])  # 距离越小奖励越大
        return obs, reward, False, False, {}
    def reset(self, seed=None):
        return np.random.randn(18).astype(np.float32), {}

env = RobotReachEnv()
model = SAC("MlpPolicy", env, verbose=1, learning_rate=3e-4, buffer_size=100_000)
model.learn(total_timesteps=500_000, log_interval=10)
model.save("sac_robot_reach")
```

---

## ✅ 今日任务

- [ ] 理解 MDP 四元组 (S, A, P, R) 的含义
- [ ] 推导 V 函数和 Q 函数的贝尔曼方程
- [ ] 理解 PPO 中 GAE-λ 的优势估计方法
- [ ] 用 stable-baselines3 的 PPO 在 Hopper-v5 上训练并评估
- [ ] 阅读 SPINNING UP (OpenAI) 中的 PPO 教程

---

## 相关笔记

← [[Day 4 - 深度学习基础]] **[[📚 具身智能10天入门|目录]]** → [[Day 6 - 模仿学习]]
