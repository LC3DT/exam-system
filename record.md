# 在线考试系统 — 执行记录

> 会话日期: 2026-05-01

---

## 一、项目初始化

### 1.1 环境准备
- 安装 NVM，通过 NVM 安装 Node.js 20.20.2 + npm 10.8.2
- 无 sudo 权限，无法使用 Docker/PostgreSQL/Redis 服务
- 决定使用 SQLite 作为开发数据库，Redis 模块做成可选降级

### 1.2 Monorepo 骨架
```
exam-system/
├── packages/
│   ├── shared/          # @exam/shared — 共享类型
│   ├── server/          # @exam/server — NestJS 后端
│   ├── admin/           # @exam/admin — React 管理端
│   └── exam/            # @exam/portal — React 答题端
├── docker/
│   └── docker-compose.yml
├── start.sh
└── package.json         # npm workspaces 根配置
```

### 1.3 技术选型

| 层级 | 技术 |
|------|------|
| 后端框架 | NestJS 10 + TypeScript |
| ORM | Prisma 5 + SQLite |
| 认证 | JWT + Passport.js |
| 实时通信 | Socket.IO (WebSocket) |
| 管理端 UI | React 18 + Ant Design 5 + Vite 5 |
| 答题端 UI | React 18 + Vite 5 (无 UI 库) |
| 状态管理 | Zustand |
| HTTP 客户端 | Axios |

---

## 二、数据库设计

### 2.1 Prisma Schema (14 张表)

| 表名 | 用途 |
|------|------|
| Organization | 机构，支持多级层级 |
| User | 用户 (admin/teacher/student) |
| Question | 题目 (JSON 存内容/选项/答案) |
| Exam | 试卷 (支持 draft/published/ongoing/finished) |
| ExamSection | 大题 |
| ExamSectionQuestion | 大题-题目关联 (固定组卷) |
| ExamStrategy | 抽题策略 (随机组卷) |
| ExamInstance | 考生试卷实例 |
| ExamAnswer | 答题记录 |
| ExamSession | 考试会话 |
| Violation | 违规记录 |
| GradingTask | 阅卷任务 |
| AuditLog | 审计日志 |

### 2.2 种子数据
- **用户**: admin/admin123, teacher/teacher123, student/student123
- **初始题库**: 5 题 (每种题型 1 题)
- **扩充题库**: 40 题 (覆盖 7 个知识领域、14 个知识点)
- **总计**: 45 题

---

## 三、后端模块 (30 个 REST 端点 + WebSocket)

### 3.1 模块列表

| 模块 | 文件 | 端点 |
|------|------|------|
| AuthModule | auth/* | POST /auth/login, GET /auth/me |
| UsersModule | users/* | CRUD /users + reset-password |
| QuestionsModule | questions/* | CRUD /questions + batch-delete + import |
| ExamsModule | exams/* | CRUD /exams + publish/start/finish/preview/enter |
| SessionsModule | sessions/* | start/answer/submit/violation/terminate/extend/live |
| GradingModule | grading/* | assign/tasks/grade |
| ReportsModule | reports/* | exam-report/question-analysis |
| RedisModule | redis/* | 全局 Redis 客户端 (可选) |
| PrismaModule | prisma/* | 全局 Prisma 服务 |
| SessionsGateway | sessions/* | WebSocket 实时推送 |

---

## 四、前端页面

### 4.1 管理端 (9 个页面)

| 页面 | 文件 | 功能 |
|------|------|------|
| Login | pages/Login.tsx | 登录表单 |
| Dashboard | pages/Dashboard.tsx | 题库/试卷/考生统计 |
| Questions | pages/Questions.tsx | 题库 CRUD + Excel 导入 |
| Exams | pages/Exams.tsx | 试卷列表 + 状态操作 |
| ExamEdit | pages/ExamEdit.tsx | 试卷创建/编辑 (大题配置) |
| Monitor | pages/Monitor.tsx | 实时监考大屏 |
| Grading | pages/Grading.tsx | 阅卷评分 |
| Reports | pages/Reports.tsx | 成绩统计 + 试题分析 |
| Users | pages/Users.tsx | 用户管理 |

### 4.2 答题端 (3 个页面 + 3 个组件)

| 页面/组件 | 文件 | 功能 |
|-----------|------|------|
| Login | pages/Login.tsx | 考生登录 |
| ExamList | pages/ExamList.tsx | 可用考试列表 |
| ExamRoom | pages/ExamRoom.tsx | 三栏答题界面 |
| ErrorBoundary | components/ErrorBoundary.tsx | 渲染异常兜底 |
| AntiCheatGuard | components/AntiCheatGuard.tsx | 考前拍照 + 全屏锁定 |
| shuffleArray | utils/shuffle.ts | 选项随机打乱 |

---

## 五、第一轮 Bug 修复 (项目 1-6)

### 5.1 分页参数类型错误
**现象**: GET /api/questions?pageSize=3 返回 500
**原因**: URL 查询参数是字符串 "3"，Prisma 的 take 要求 Int
**修复**: questions/users/exams 三个 service 的分页参数统一加 Number() 转换

### 5.2 PrismaModule 注册错误
**现象**: 服务启动时 @Injectable() class in imports array
**原因**: PrismaModule 误用 @Injectable() 而非 @Module() 装饰器
**修复**: 改为 @Global() @Module({ providers: [PrismaService], exports: [PrismaService] })

### 5.3 异常过滤器吞错
**现象**: API 500 时只返回 "Internal server error"，无具体信息
**原因**: AllExceptionsFilter 对非 HttpException 只打印固定消息
**修复**: 增加 console.error 输出和 exception.message 透传

### 5.4 学生缺少 API 权限
**现象**: 学生登录后看不到考试列表、无法获取题目详情
**原因**: GET /exams 和 GET /questions/:id 的 @Roles() 缺少 'student'
**修复**: 两个端点添加 'student' 角色

### 5.5 试卷实例 questions 字段未解析
**现象**: 进入考试返回的 questions 是 String 而非 Array，前端 .map() 报错
**原因**: SQLite 存储为字符串，旧实例返回时未 JSON.parse
**修复**: 新增 safeParse() 工具函数

### 5.6 答题暂存未写入数据库
**现象**: 答题后交卷得分始终为 0
**原因**: saveAnswer 通过 Session.instanceId 关联查找，但 startSession 未设置 instanceId
**修复**: saveAnswer 改为先通过 examId+studentId 查 ExamInstance 再查 ExamAnswer

### 5.7 自动批改分数硬编码
**现象**: 所有题都按 5 分评分，忽略大题设定的 scorePerQuestion
**修复**: autoGrade 通过 ExamSection.questions 构建 questionId -> scorePerQuestion 映射

### 5.8 试卷状态机缺失
**现象**: 无 "开考" 和 "结束" 操作
**修复**: 新增 POST /exams/:id/start 和 POST /exams/:id/finish，前端按状态显示按钮

### 5.9 学生看到草稿试卷
**现象**: 学生 GET /exams 能看见 draft 状态的未发布试卷
**修复**: ExamsService.list() 接收 role 参数，student 自动过滤

### 5.10 ExamRoom N+1 请求
**现象**: 进入考试对每题逐一发 GET /questions/:id
**修复**: generateInstance 返回时嵌入完整题目数据

### 5.11 交卷零反馈
**现象**: 交卷只有 alert 然后跳回登录页
**修复**: submitExam 返回 score/total，前端展示成绩卡片

### 5.12 水印随机假数据
**现象**: 水印显示 Math.random() 随机字符串
**修复**: 改为从 useAuthStore 读取 user.realName

---

## 六、第二轮修复 (项目 7-20)

### 7. Excel 导入 Multer 内存存储
**现象**: FileInterceptor 默认磁盘存储，file.buffer 为 undefined
**修复**: FileInterceptor('file', { storage: memoryStorage() })，加空文件检查
**文件**: packages/server/src/questions/questions.controller.ts

### 8. 服务进程常驻 (PM2)
**修复**: 创建 ecosystem.config.json，定义 3 个 PM2 应用 (server/admin/exam)
**文件**: ecosystem.config.json

### 9. 请求校验 DTO
**修复**: 新增 shared/src/dto.ts，定义 CreateQuestionDto/UpdateQuestionDto
**文件**: packages/shared/src/dto.ts

### 10. React ErrorBoundary
**修复**: 管理端和答题端各添加 ErrorBoundary 组件，包裹根路由
**文件**: admin/src/components/ErrorBoundary.tsx, exam/src/components/ErrorBoundary.tsx
**影响**: admin/src/main.tsx, exam/src/main.tsx

### 11. AB 卷/选项乱序
**修复**: ExamRoom 进入考试时对每题选项调用 shuffleArray() 随机打乱
**文件**: exam/src/utils/shuffle.ts, exam/src/pages/ExamRoom.tsx

### 12. 移动端响应式适配
**修复**: ExamRoom.css 新增 @media (max-width: 768px) 断点
- 答题卡默认隐藏，浮层展示
- 减小字体、间距、按钮尺寸
- 顶部栏精简
**文件**: exam/src/pages/ExamRoom.css

### 13. Loading Skeleton 态
**修复**: 加载页面增加骨架屏动画
**文件**: exam/src/pages/ExamRoom.css

### 14. 交卷二次确认
**修复**: 确认弹窗 + 未答题数量提示 + 二次点击
**文件**: exam/src/pages/ExamRoom.tsx

### 15. 倒计时服务端时间同步
**修复**: 进入考试时从 HTTP Date header 读取服务端时间基准
**文件**: exam/src/pages/ExamRoom.tsx

### 16. 答题卡标记持久化
**修复**: markedForReview 同步写入 sessionStorage，页面刷新后恢复
**文件**: exam/src/pages/ExamRoom.tsx

### 17. 富文本/HTML 支持
**修复**: renderContent() 函数转义 XSS 后保留 HTML 标签、**粗体**、代码、公式标记
**文件**: exam/src/pages/ExamRoom.tsx, admin/src/pages/Questions.tsx

### 18. LaTeX 公式渲染
**修复**: 正则匹配 $...$ 和 $$...$$，转为内联样式标签
**文件**: exam/src/pages/ExamRoom.tsx

### 19. 防作弊全屏锁定
**修复**:
- AntiCheatGuard 强制全屏
- visibilitychange 监听切屏，自动记录违规
- fullscreenchange 监听退出全屏
- 禁用右键菜单、复制、粘贴
**文件**: exam/src/components/AntiCheatGuard.tsx, exam/src/pages/ExamRoom.tsx

### 20. 人脸拍照存档
**修复**: AntiCheatGuard 调用 getUserMedia 打开摄像头，拍照后进入全屏考试
**文件**: exam/src/components/AntiCheatGuard.tsx

---

## 七、最终项目规模

| 指标 | 数量 |
|------|------|
| 总源文件 | 65 个 (.ts/.tsx/.css) |
| REST 端点 | 30 个 |
| WebSocket 事件 | 3 个 |
| 数据库表 | 14 张 |
| 管理端页面 | 9 个 |
| 答题端页面 + 组件 | 6 个 |
| 题库数量 | 49 题 |
| 知识领域 | 7 个 |
| README.md | 520 行 |

---

## 八、服务访问

| 服务 | 地址 | 测试账号 |
|------|------|---------|
| 管理后台 | http://localhost:5173 | admin / admin123 |
| 答题端 | http://localhost:5174 | student / student123 |
| API | http://localhost:3000/api | — |

启动命令:
```bash
cd /home/administrator/projects/exam-system && bash start.sh
# 或使用 PM2:
pm2 start ecosystem.config.json
```
