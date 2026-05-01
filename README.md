# 在线考试系统 (Exam System)

企业/教育级在线考试平台，支持题库管理、智能组卷、考场监控、自动阅卷与数据统计分析。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **后端框架** | NestJS 10 + TypeScript | 模块化架构，内置依赖注入 |
| **数据库** | SQLite (开发) / PostgreSQL (生产) | Prisma ORM |
| **缓存** | Redis (可选) | 答题暂存、会话管理 |
| **认证** | JWT + Passport.js | 24 小时过期，RBAC 权限控制 |
| **实时通信** | Socket.IO | 监考大屏实时推送 |
| **前端管理端** | React 18 + Ant Design 5 + Vite 5 | TypeScript |
| **前端答题端** | React 18 + Vite 5 | 轻量无 UI 库，极致加载速度 |
| **状态管理** | Zustand | 轻量级 React 状态库 |
| **包管理** | npm Workspaces | Monorepo |

---

## 系统架构

```
┌──────────────────────┐     ┌──────────────────────┐
│   Admin Portal (:5173)│     │   Exam Portal (:5174) │
│   React + Ant Design  │     │   React (轻量)        │
│   /api ──proxy──┐     │     │   /api ──proxy──┐     │
└─────────────────┼────┘     └─────────────────┼────┘
                  │                              │
          ┌───────▼─────────────┐    ┌───────────▼────────┐
          │   NestJS API :3000  │◄──►│  WebSocket /monitor │
          │   /api/*            │    │  (Socket.IO)        │
          └──┬──────────┬───────┘    └────────────────────┘
             │          │
     ┌───────▼──┐  ┌────▼──────┐
     │  SQLite/  │  │   Redis   │
     │ PostgreSQL│  │  (缓存)   │
     └──────────┘  └───────────┘
```

---

## 项目结构

```
exam-system/
├── packages/
│   ├── shared/              # 共享类型定义 (枚举、DTO 接口)
│   │   └── src/index.ts
│   ├── server/              # NestJS 后端 (28 个 REST 端点 + WebSocket)
│   │   └── src/
│   │       ├── auth/        # JWT 认证 (登录/获取信息)
│   │       ├── users/       # 用户管理 CRUD
│   │       ├── questions/   # 题库管理 (CRUD + Excel 导入)
│   │       ├── exams/       # 试卷管理 (固定/随机组卷 + 发布)
│   │       ├── sessions/    # 考试会话 (答题暂存/交卷/违规记录)
│   │       ├── grading/     # 阅卷管理 (任务分配/评分)
│   │       ├── reports/     # 统计分析 (成绩/试题分析)
│   │       ├── redis/       # Redis 客户端模块
│   │       ├── prisma/      # 数据库 Schema + 种子数据
│   │       └── common/      # 公共守卫/过滤器/拦截器
│   ├── admin/               # 管理端 React SPA
│   │   └── src/
│   │       ├── pages/       # 9 个页面
│   │       ├── components/  # 布局组件
│   │       ├── api/         # Axios 客户端
│   │       └── stores/      # Zustand 状态
│   └── exam/                # 答题端 React SPA
│       └── src/
│           ├── pages/       # 3 个页面
│           ├── api/         # Axios 客户端
│           └── stores/      # Zustand 状态
├── docker/
│   └── docker-compose.yml   # PostgreSQL + Redis
├── start.sh                 # 一键启动脚本
└── package.json             # Monorepo 根配置
```

---

## 功能特性

### 管理后台 (`localhost:5173`)

| 页面 | 功能 |
|------|------|
| **仪表盘** | 题库数量、试卷数量、考生人数统计 |
| **题库管理** | 题目 CRUD，按题型/知识点/难度筛选，Excel 批量导入 |
| **试卷管理** | 固定组卷 (手动选题) / 随机组卷 (按知识点+难度抽题)，AB 卷、选项乱序 |
| **考场监控** | 实时显示在线/已交卷人数，违规告警列表，强制收卷、延长作答 |
| **阅卷管理** | 主观题按题分配评卷人，流水线评分 |
| **统计分析** | 最高/最低/平均分、及格率、得分分布、试题区分度分析 |
| **用户管理** | 管理员/教师/学生三种角色，创建、编辑、密码重置 |

### 答题端 (`localhost:5174`)

| 功能 | 说明 |
|------|------|
| **考试列表** | 登录后展示已发布的考试，点击进入 |
| **三栏布局** | 顶部倒计时 + 中部答题区 + 右侧答题卡网格 |
| **自动暂存** | 每次操作即时保存至服务端缓存 |
| **水印覆盖** | 全屏半透明动态水印（显示考生真实姓名和ID） |
| **答题卡** | 区分已答/未答/标记待查状态，点击跳转 |
| **倒计时** | 最后 5 分钟红色预警，服务端时间同步 |
| **考前拍照** | 调用摄像头拍照存档【#20】 |
| **全屏锁定** | 进入考试强制全屏，退出记录违规【#19】 |
| **切屏检测** | 监测页面可见性，切屏记录违规【#19】 |
| **防泄密** | 禁用右键菜单、复制、粘贴【#19】 |
| **选项乱序** | 每题选项随机打乱显示【#11】 |
| **交卷确认** | 二次确认弹窗，提示未答题数【#14】 |
| **成绩展示** | 交卷后显示得分/总分/百分比/及格状态 |
| **移动端适配** | 响应式布局，答题卡折叠为浮层【#12】 |

### 题目内容格式

题目内容支持以下标记语法，答题端会自动渲染：

| 语法 | 效果 |
|------|------|
| `**粗体**` | **粗体** |
| `` `代码` `` | 内联代码 |
| `$E=mc^2$` | 行内公式 |
| `$$\\int_0^\\infty$$` | 块级公式 |
| `<html><b>HTML</b></html>` | 直接 HTML 标签 |

- **单选题** (single) — 圆点选择器
- **多选题** (multiple) — 复选框选择器
- **判断题** (judge) — 正确/错误按钮
- **填空题** (fill) — 文本输入
- **主观题** (essay) — 多行文本输入 (待扩展: 代码题)

---

## 快速开始

### 前置要求

- **Node.js** >= 20.x
- **npm** >= 10.x
- (可选) Docker + Docker Compose (PostgreSQL/Redis 生产环境)

### 1. 安装依赖

```bash
cd exam-system
npm install
```

### 2. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate --schema=packages/server/src/prisma/schema.prisma

# 创建数据库并执行迁移
DATABASE_URL="file:./dev.db" npx prisma migrate dev --name init --schema=packages/server/src/prisma/schema.prisma

# 写入种子数据 (用户 + 题库)
DATABASE_URL="file:./dev.db" npx ts-node packages/server/src/prisma/seed.ts
DATABASE_URL="file:./dev.db" npx ts-node packages/server/src/prisma/seed-questions.ts
```

### 3. 一键启动

```bash
bash start.sh
```

或分别启动：

```bash
# 终端 1: 后端 API (3000)
npm run dev:server

# 终端 2: 管理端 (5173)
npm run dev:admin

# 终端 3: 答题端 (5174)
npm run dev:exam
```

### 4. 访问

| 入口 | 地址 | 账号 | 密码 |
|------|------|------|------|
| 管理后台 | http://localhost:5173 | `admin` | `admin123` |
| 教师账号 | http://localhost:5173 | `teacher` | `teacher123` |
| 答题端 | http://localhost:5174 | `student` | `student123` |

---

## API 接口文档

所有接口前缀: `/api`

### 认证模块

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/auth/login` | 公开 | 登录，返回 JWT token |
| GET | `/auth/me` | 登录用户 | 获取当前用户信息 |

### 用户管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/users` | admin, teacher | 用户列表 (分页) |
| GET | `/users/:id` | admin, teacher | 用户详情 |
| POST | `/users` | admin | 创建用户 |
| PUT | `/users/:id` | admin | 更新用户 |
| PUT | `/users/:id/reset-password` | admin | 重置密码 |

### 题库管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/questions` | admin, teacher | 题目列表 (按类型/知识点/难度/标签筛选) |
| GET | `/questions/:id` | admin, teacher, student | 题目详情 |
| POST | `/questions` | admin, teacher | 创建题目 |
| PUT | `/questions/:id` | admin, teacher | 更新题目 |
| DELETE | `/questions/:id` | admin, teacher | 删除题目 (软删除) |
| POST | `/questions/batch-delete` | admin, teacher | 批量删除 |
| POST | `/questions/import` | admin, teacher | Excel 批量导入 |

### 试卷管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/exams` | admin, teacher, student | 试卷列表 |
| GET | `/exams/:id` | admin, teacher, student | 试卷详情 |
| POST | `/exams` | admin, teacher | 创建试卷 |
| PUT | `/exams/:id` | admin, teacher | 编辑试卷 (仅草稿) |
| POST | `/exams/:id/publish` | admin, teacher | 发布试卷 (draft → published) |
| POST | `/exams/:id/start` | admin, teacher | 开考 (published/ongoing → ongoing) |
| POST | `/exams/:id/finish` | admin, teacher | 结束考试 (ongoing/published → finished) |
| GET | `/exams/:id/preview` | admin, teacher | 试卷分析预览 |
| POST | `/exams/:id/enter` | admin, teacher, student | 考生进入考试 (生成实例，返回题目快照) |

### 考试会话

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/sessions/:examId/start` | 登录用户 | 开始考试会话 |
| POST | `/sessions/:sessionId/answer` | 登录用户 | 保存答案 (Redis + DB) |
| POST | `/sessions/:sessionId/submit` | 登录用户 | 交卷 (自动批改客观题，返回成绩) |
| GET | `/sessions/:sessionId/answers` | 登录用户 | 获取缓存答案 |
| POST | `/sessions/:sessionId/violation` | 登录用户 | 记录违规 |
| GET | `/sessions/:examId/live` | admin, teacher | 实时考场状态 |
| POST | `/sessions/:sessionId/terminate` | admin, teacher | 强制收卷 |
| POST | `/sessions/:sessionId/extend` | admin, teacher | 延长作答时间 |

### 阅卷管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/grading/assign` | admin, teacher | 分配阅卷任务 |
| GET | `/grading/tasks` | admin, teacher | 我的阅卷任务 |
| POST | `/grading/tasks/:taskId/grade` | admin, teacher | 提交评分 |

### 统计分析

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/reports/exam/:examId` | admin, teacher | 考试成绩报告 |
| GET | `/reports/exam/:examId/questions` | admin, teacher | 试题分析 (正确率/异常标记) |

### WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `joinExamRoom` | Client → Server | 加入监考房间 `exam:{examId}` |
| `liveStatus` | Server → Client | 实时考场状态推送 |
| `newViolation` | Server → Client | 新违规事件推送 |

---

## 数据库模型 ER 图

```
Organization (机构)
    │ 1:N
    ▼
  User (用户)
    ├── 1:N ── Question (题目)
    │              ├── N:M ── ExamSection (大题)
    │              │              └── N:1 ── Exam (试卷)
    │              │
    ├── 1:N ── Exam (试卷, 创建者)
    │
    ├── 1:N ── ExamInstance (试卷实例)
    │              └── 1:N ── ExamAnswer (答题记录)
    │
    ├── 1:N ── ExamSession (考试会话)
    │              └── 1:N ── Violation (违规记录)
    │
    ├── 1:N ── GradingTask (阅卷任务, 评卷人/分配者)
    │
    └── 1:N ── AuditLog (审计日志)
```

### 核心表说明

| 表名 | 说明 |
|------|------|
| `User` | 用户，支持 admin/teacher/student 三种角色 |
| `Question` | 题目，JSON 存储内容和选项，多维标签 |
| `Exam` | 试卷，支持 draft/published/ongoing/finished 状态 |
| `ExamSection` | 大题，关联题目或抽题策略 |
| `ExamStrategy` | 随机组卷策略 (知识点 + 难度区间 + 数量) |
| `ExamSectionQuestion` | 固定组卷题目关联 |
| `ExamInstance` | 考生试卷实例，快照题目列表 |
| `ExamAnswer` | 答题记录，含得分和批改状态 |
| `ExamSession` | 考试会话，记录起止时间和违规次数 |
| `Violation` | 违规记录 (切屏/退出全屏/人脸失败/长时间无操作) |
| `GradingTask` | 阅卷任务，按题目分配给评卷人 |
| `AuditLog` | 审计日志，记录所有数据变更操作 |

---

## 配置说明

### 环境变量 (`packages/server/.env`)

```env
DATABASE_URL="file:./dev.db"              # SQLite 开发 / PostgreSQL 生产
JWT_SECRET=exam-system-secret-key-2024     # JWT 签名密钥
REDIS_HOST=localhost                       # Redis 地址
REDIS_PORT=6379                            # Redis 端口
```

### PostgreSQL 生产环境

修改 `DATABASE_URL` 为:

```env
DATABASE_URL="postgresql://exam_user:exam_pass_2024@localhost:5432/exam_system"
```

并同步修改 `schema.prisma` 的 `datasource` `provider` 为 `"postgresql"`，将 `String` 类型的 JSON 字段改为 `Json` 类型。

---

## 进程守护 (PM2)

```bash
npm install -g pm2
pm2 start ecosystem.config.json
pm2 status
```

## 部署指南

### Docker Compose (生产推荐)

```bash
# 启动 PostgreSQL + Redis
docker compose -f docker/docker-compose.yml up -d

# 构建前端
npm run build:all

# 配置 .env 为 PostgreSQL 连接串
# 启动后端
cd packages/server && node dist/main.js
```

### Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name admin.exam.com;
    location / { root /app/admin/dist; try_files $uri /index.html; }
    location /api { proxy_pass http://localhost:3000; }
}
server {
    listen 80;
    server_name exam.exam.com;
    location / { root /app/exam/dist; try_files $uri /index.html; }
    location /api { proxy_pass http://localhost:3000; }
}
```

---

## 试题 JSON 格式说明

题目内容、选项、答案均以 JSON 格式存储：

```json
{
  "type": "single",
  "content": { "text": "JavaScript 中 typeof null 的结果是？" },
  "options": [
    { "label": "A", "content": "null" },
    { "label": "B", "content": "undefined" },
    { "label": "C", "content": "object" },
    { "label": "D", "content": "string" }
  ],
  "answer": { "correct": "C" },
  "knowledgePoint": "JavaScript基础",
  "difficulty": 0.3,
  "estimatedTime": 30,
  "tags": ["JavaScript", "基础"]
}
```

### 各题型答案格式

| 题型 | `answer` 格式 |
|------|---------------|
| 单选 | `{ "correct": "A" }` |
| 多选 | `{ "correct": ["A", "B", "D"] }` |
| 判断 | `{ "correct": true }` |
| 填空 | `{ "correct": "useState" }` |
| 主观 | `{ "correct": "" }` |

---
## 试卷状态机

```
draft ──[发布]──► published ──[开考]──► ongoing ──[结束]──► finished
                      │                     │
                      └─────[开考]──────────┘
```

| 状态 | 说明 | 可操作 |
|------|------|--------|
| **draft** | 草稿 | 编辑、删除、发布 |
| **published** | 已发布 | 开考、结束 |
| **ongoing** | 进行中 | 监控、强制收卷、结束 |
| **finished** | 已结束 | 查看统计报告 |


## 自动批改机制

交卷时系统自动批改客观题（单选/多选/判断），每题分数按**所属大题的 `scorePerQuestion`** 计算：

- 开发能力测试: 单选 5分、多选 8分、判断 5分、填空 8分
- 交卷后即时返回成绩：`{ score: 65, total: 100, message: "交卷成功" }`

主观题（填空/问答/代码）需教师通过阅卷管理手动评分。

---

## 随机组卷策略

试卷创建时选择 `random` 模式，每道大题配置策略：

```json
{
  "name": "JavaScript 选择题",
  "scorePerQuestion": 5,
  "randomStrategies": [
    {
      "knowledgePoint": "JavaScript基础",
      "difficulty": { "min": 0.1, "max": 0.3 },
      "count": 3
    },
    {
      "knowledgePoint": "JavaScript进阶",
      "difficulty": { "min": 0.4, "max": 0.7 },
      "count": 2
    }
  ]
}
```

考生进入考试时，系统根据策略实时从题库中抽取符合条件的题目。

---

## 开发指南

### 添加新模块

```bash
# 使用 NestJS CLI 生成
cd packages/server
npx nest generate module new-module
npx nest generate controller new-module
npx nest generate service new-module
```

### 数据库迁移

```bash
# 修改 schema.prisma 后
npx prisma migrate dev --name describe_change --schema=packages/server/src/prisma/schema.prisma

# 重新生成客户端
npx prisma generate --schema=packages/server/src/prisma/schema.prisma
```

### 代码检查

```bash
# TypeScript 类型检查
npx tsc --noEmit -p packages/server/tsconfig.json
npx tsc --noEmit -p packages/admin/tsconfig.json
npx tsc --noEmit -p packages/exam/tsconfig.json
```

---

## 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | 全部权限 |
| 教师 | `teacher` | `teacher123` | 题库/试卷/阅卷/报表 |
| 学生 | `student` | `student123` | 参加考试 |

---

## 题库规模

当前种子数据包含 **49 道** 题目，覆盖 7 个知识领域、14 个知识点，难度从 0.1 到 0.9 均匀分布。

---

## License

MIT
