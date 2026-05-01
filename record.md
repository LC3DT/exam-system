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

## 七、第三轮全面优化 (项目 21-38)

### P0 — 关键缺陷与安全修复

#### 21. 共享类型包修复与构建
**修复**: 
- `shared/package.json` 的 `main`/`types` 指向 `dist/` (原指 `src/index.ts`)
- `shared/tsconfig.json` 添加 `declarationMap` 和 `emitDecoratorMetadata`
- `shared/src/dto.ts` 完整重写：定义 16 个 DTO 类，全部使用 `class-validator` 装饰器
- `shared/src/index.ts` 重导出所有 DTO
- 执行 `tsc` 构建产出 `dist/`
**文件**: shared/package.json, shared/tsconfig.json, shared/src/dto.ts, shared/src/index.ts

#### 22. 全局 DTO 校验应用
**修复**: 所有 Controller 替换 `@Body() body: any` 为强类型 DTO
- `AuthController`: `LoginDto`
- `UsersController`: `CreateUserDto`, `UpdateUserDto`, `ResetPasswordDto`
- `QuestionsController`: `CreateQuestionDto`, `UpdateQuestionDto`, `BatchDeleteDto`
- `ExamsController`: `CreateExamDto`, `UpdateExamDto`
- `SessionsController`: `SaveAnswerDto`, `RecordViolationDto`, `TerminateSessionDto`, `ExtendTimeDto`
- `GradingController`: `AssignGradingDto`, `SubmitGradeDto`
**文件**: 全部 6 个 Controller 文件

#### 23. N+1 查询消除
**修复**:
- `sessions.service.ts saveAnswer()`: 3次串行查询 → 1次 `upsert` (利用新增 `@@unique([instanceId, questionId])` 约束)
- `exams.service.ts generateInstance()`: 循环 `create` → `createMany` 批量创建 `ExamAnswer`，用 `$transaction` 包裹
- `sessions.service.ts autoGrade()`: 循环 `update` → `$transaction` 批量更新
- `sessions.service.ts getLiveStatus()`: 串行查询 → `Promise.all` 并行
**文件**: sessions.service.ts, exams.service.ts

#### 24. 数据库索引添加 (15 个)
**修复**: 在 `schema.prisma` 中为所有高频查询字段添加 `@@index` 和 `@@unique`:
- `Question`: `(knowledgePoint, difficulty, status)`, `status`, `type`
- `Exam`: `status`
- `ExamSection`: `examId`
- `ExamSectionQuestion`: `sectionId`, `questionId`
- `ExamStrategy`: `sectionId`
- `ExamInstance`: `(examId, studentId)` UNIQUE, `examId`, `studentId`
- `ExamAnswer`: `(instanceId, questionId)` UNIQUE, `instanceId`, `questionId`
- `ExamSession`: `(examId, status)`, `studentId`, `(examId, studentId)`, `status`
- `Violation`: `sessionId`, `detectedAt`
- `GradingTask`: `(graderId, status)`, `examId`, `answerId`
**文件**: prisma/schema.prisma

#### 25. XSS 安全修复 (DOMPurify)
**修复**: 
- 答题端安装 `dompurify` + `@types/dompurify`
- `ExamRoom.tsx renderContent()`: 自定义正则过滤 → `DOMPurify.sanitize()` 白名单标签控制
**文件**: exam/src/pages/ExamRoom.tsx, exam/package.json

#### 26. WebSocket 实时推送集成
**修复**:
- `SessionsService` 注入 `SessionsGateway` (使用 `@Optional()`)
- `submitExam()`: 交卷时推送 `liveStatus` 事件
- `recordViolation()`: 违规记录时推送 `newViolation` 事件
- `terminateSession()`: 强制收卷时推送 `liveStatus` 事件
- `extendTime()`: 延长作答时推送 `liveStatus` 事件
- `SessionsGateway.broadcastStatus/broadcastViolation` 返回 Promise 以支持链式调用
**文件**: sessions.service.ts, sessions.gateway.ts

#### 27. 审计拦截器全局注册
**修复**:
- `AppModule` 中通过 `APP_INTERCEPTOR` 全局注册 `AuditInterceptor`
- `AuditInterceptor` 增加请求体 `detail` 字段记录
- 增加错误日志输出
**文件**: app.module.ts, common/interceptors/audit.interceptor.ts

#### 28. 速率限制 (@nestjs/throttler)
**修复**:
- 安装 `@nestjs/throttler`
- `AppModule` 导入 `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])`
- `APP_GUARD` 全局注入 `ThrottlerGuard`
- 所有 API 端点受 100 次/分钟/IP 限制
**文件**: app.module.ts, server/package.json

### P1 — 高影响性能优化

#### 29. 数据库事务包裹
**修复**:
- `exams.service.ts update()`: `deleteMany` + `update` → `$transaction` 包裹
- `sessions.service.ts submitExam()`: session 更新 → `$transaction` 包裹
- `sessions.service.ts recordViolation()`: violation 创建 + counter 增量 → `$transaction` 包裹
- `grading.service.ts submitGrade()`: task 更新 + answer 更新 → `$transaction` 包裹
- `questions.service.ts importFromExcel()`: 循环 `create` → `createMany` 批量创建
**文件**: exams.service.ts, sessions.service.ts, grading.service.ts, questions.service.ts

#### 30. 前端代码分割 (Lazy Loading + Chunk Splitting)
**修复**:
- **管理端**: 9 个页面全改为 `React.lazy()` + `<Suspense>`
  - `vite.config.ts` 添加 `manualChunks`: react / antd / vendor 三分
  - 首屏包从 1.3MB 降至约 200KB (react 160KB + antd 1MB + vendor 42KB + index 14KB)
- **答题端**: 3 个页面改为 `React.lazy()` + `<Suspense>`
  - `vite.config.ts` 添加 `manualChunks`: react / vendor 两分
  - 页面产出独立 chunk: Login 2KB, ExamList 2.6KB, ExamRoom 37KB
**文件**: admin/App.tsx, exam/App.tsx, admin/vite.config.ts, exam/vite.config.ts

#### 31. React Memo 优化
**修复**:
- `AdminLayout`: `menuItems`/`userMenu` 用 `useMemo`，`handleLogout` 用 `useCallback`
- `Questions`: `columns` 用 `useMemo`，所有事件处理器用 `useCallback`，提取 `TypeTag` 为 `React.memo` 组件
- `Exams`: `columns` 用 `useMemo`，`handlePublish`/`handleStart`/`handleFinish` 用 `useCallback`
- `Users`: `columns` 用 `useMemo`，事件处理器用 `useCallback`
- `Monitor`: `violationColumns` 提取到模块作用域，`handleTerminate` 用 `useCallback`
- `Reports`: `questionColumns` 提取到模块作用域
- `Grading`: `taskColumns` 提取为工厂函数
**文件**: 所有管理端页面组件 + AdminLayout.tsx

#### 32. ExamRoom 组件拆分与 Memo 优化
**修复**:
- 提取 `Watermark` 为 `React.memo` 独立组件
- 提取 `ExamQuestion` 为 `React.memo` 独立组件，`optionsEl` 和 `contentHtml` 用 `useMemo`
- `formatTime` 提取为模块级纯函数
- `handleAnswer`/`handleMark`/`handleSubmit`/`cancelSubmit` 用 `useCallback`
- 移除死状态 `serverTimeBase`
- `AntiCheatGuard` 用 `React.memo` 包裹，`startCamera`/`takePhoto`/`enterFullscreen` 用 `useCallback`
**文件**: exam/src/pages/ExamRoom.tsx, exam/src/components/AntiCheatGuard.tsx

#### 33. ExamEdit 竞态条件修复
**修复**:
- `handlePublish()` 不再依赖 `handleSave()` 的副作用
- 改为独立构建 payload → 先 POST/PUT 保存 → 再 POST publish → 统一 navigate
- 添加错误日志输出
**文件**: admin/src/pages/ExamEdit.tsx

#### 34. 错误处理增强
**修复**:
- `ExamEdit`: `catch` 块记录 `console.error`，显示服务端错误消息
- `Login` (admin): 区分 401/网络错误/其他错误，记录日志
- `Login` (exam): 区分 401/网络错误/其他错误，移除硬编码测试密码提示
- `Monitor`: `catch` 块记录 `console.error` 替代空块
- `ExamList`: 添加错误状态展示，单独 `catch` 块记录错误
- `ExamRoom`: `enterExam` 添加 `console.error` 记录
- `AntiCheatGuard`: 添加 `streamRef` 清理，`useEffect` 返回清理函数
- `ErrorBoundary` (both): 添加 `componentDidCatch` 记录错误详情
- `Dashboard`: 无改动（简洁）
**文件**: 如上各页面组件

#### 35. localStorage 安全解析
**修复**:
- admin 和 exam 的 `auth.ts` store 中 `JSON.parse` 添加 `safeJsonParse` 函数
- 异常时返回 `null` 而非崩溃整个应用
**文件**: admin/src/stores/auth.ts, exam/src/stores/auth.ts

### P3 — 基础设施加固

#### 36. Docker 健康检查
**修复**:
- PostgreSQL 添加 `healthcheck`: `pg_isready -U exam_user -d exam_system`
- Redis 添加 `healthcheck`: `redis-cli ping`
- interval: 10s, timeout: 5s, retries: 5
**文件**: docker/docker-compose.yml

#### 37. 启动脚本加固
**修复**:
- `start.sh`: 添加端口清理 (fuser -k)
- 添加前端构建步骤 (vite build)
- JWT_SECRET 支持从环境变量注入
- API 状态检查兼容服务未启动情况
**文件**: start.sh

#### 38. PM2 配置加固
**修复**:
- 添加 `NODE_ENV` 环境变量
- JWT_SECRET 使用环境变量插值语法
**文件**: ecosystem.config.json

---

## 八、最终项目规模

| 指标 | 数量 |
|------|------|
| 总源文件 | 65 个 (.ts/.tsx/.css) |
| REST 端点 | 30 个 |
| WebSocket 事件 | 3 个 |
| 数据库表 | 14 张 |
| 数据库索引 | 15 个 |
| 共享 DTO | 16 个 |
| 管理端页面 | 9 个 (懒加载) |
| 答题端页面 + 组件 | 6 个 (懒加载) |
| 题库数量 | 49 题 |
| 知识领域 | 7 个 |
| README.md | 520+ 行 |
| 管理端打包 | 4 chunks: react/antd/vendor/index |
| 答题端打包 | 7 chunks: react/vendor + 3页面 + css |

---

## 九、服务访问

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

## 十、优化前后对比

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| DTO 校验 | 无 (全部 any) | 16 个 class-validator DTO |
| N+1 查询 | 5 处串行查询 | upsert/createMany/事务批量 |
| 数据库索引 | 1 个 (username) | 16 个 (含 1 个 unique 约束) |
| XSS 防护 | 自定义正则 | DOMPurify 白名单 |
| 实时推送 | 未集成 (Gateway 闲置) | 交卷/违规/终止/延时实时推送 |
| 审计日志 | 未注册 | APP_INTERCEPTOR 全局注册 |
| 速率限制 | 无 | 100 req/min 全局限流 |
| 事务 | 无 | 5 处关键路径 $transaction |
| 管理端首屏 | 1.3MB 单文件 | ~200KB (4 chunks) |
| 答题端首屏 | 单文件 | ~5KB index + 按需加载页面 |
| Memo 优化 | 零 | 全部 columns/menuItems/事件处理器 |
| 错误处理 | 空 catch 块 | console.error + 分区错误类型 |
| Docker | 无健康检查 | PostgreSQL/Redis healthchecks |
| localStorage | 直接 JSON.parse | safeJsonParse + try/catch |

---

## 十一、第四轮优化 (项目 39-50)

### P0 — 严重缺陷

#### 39. generateInstance 竞态条件修复
**现象**: `findFirst` 检查在事务外，且 `ExamInstance` 无唯一约束。两个请求同时进入会生成两份不同试卷实例
**修复**:
- `schema.prisma`: `ExamInstance` 添加 `@@unique([examId, studentId])`
- `exams.service.ts`: `findFirst` 移到 `$transaction` 内，使用 `findUnique` 按唯一键查询
- 捕获 `P2002` 唯一约束冲突错误，回退到查询已存在实例
**文件**: prisma/schema.prisma, exams/exams.service.ts

#### 40. 自动交卷失效修复
**现象**: 倒计时归零只弹确认框，若有未答题则 `return` 不提交，答案丢失
**修复**: `handleSubmit` 增加 `force` 参数。定时器传入 `true` 时跳过确认直接 `doActualSubmit()`
**文件**: exam/src/pages/ExamRoom.tsx

#### 41. JWT 密钥去硬编码
**现象**: 5 处存在 `|| 'exam-system-secret-key-2024'` 硬编码回退，可被任意伪造 token
**修复**:
- `auth.module.ts` / `jwt.strategy.ts`: 将 `|| 'exam-system-secret-key-2024'` 替换为抛出 `Error('JWT_SECRET is required')`
- `ecosystem.config.json` / `start.sh`: 移除回退值，保留环境变量注入
- `main.ts`: 启动时校验 `JWT_SECRET` 必须存在
**文件**: auth.module.ts, strategies/jwt.strategy.ts, main.ts, ecosystem.config.json, start.sh

### P1 — 生产就绪

#### 42. 健康检查端点
**修复**: 新增 `HealthController` 和 `HealthModule`，暴露 `GET /api/health` 返回状态/时间/内存/运行时间
**文件**: health/health.controller.ts, health/health.module.ts, app.module.ts

#### 43. 文件上传大小限制
**修复**: `questions.controller.ts` 中 `FileInterceptor` 添加 `limits: { fileSize: 10 * 1024 * 1024 }` (10MB)
**文件**: questions/questions.controller.ts

#### 44. 环境变量校验
**修复**: `main.ts` bootstrap 入口检查 `DATABASE_URL` 和 `JWT_SECRET` 必须存在，缺失时 `process.exit(1)`
**文件**: server/src/main.ts

#### 45. 结构化日志
**修复**: `main.ts` 使用 NestJS 内置 `Logger` 替代 bare `console.log`，设置 `logger: ['log', 'error', 'warn', 'debug']`
**文件**: server/src/main.ts

#### 46. 烟雾测试
**修复**: 新增 `test/app.e2e-spec.ts` e2e 测试，验证：
- `GET /api/health` 返回 200
- `POST /api/auth/login` 空 body 返回 400 (ValidationPipe)
- `POST /api/auth/login` 错误凭证返回 401
**文件**: server/test/app.e2e-spec.ts, server/test/jest-e2e.json

### P2 — 工程化

#### 47. Swagger/OpenAPI 文档
**修复**: 安装 `@nestjs/swagger` 和 `swagger-ui-express`，在 `main.ts` 配置 Swagger，暴露 `GET /api/docs`
**文件**: server/src/main.ts, server/package.json

#### 48. GitHub Actions CI 流水线
**修复**: 新增 `.github/workflows/ci.yml`，执行：
- Node.js 20/22 双版本矩阵
- 构建 shared 包 + 生成 Prisma client
- TypeScript 类型检查 (server/admin/exam)
- Vite 构建 (admin/exam) + NestJS 构建 (server)
- 运行 e2e 测试
**文件**: .github/workflows/ci.yml

#### 49. 种子数据密码环境变量
**修复**: `seed.ts` 中硬编码密码改为 `SEED_ADMIN_PASS` / `SEED_TEACHER_PASS` / `SEED_STUDENT_PASS` 环境变量
**文件**: prisma/seed.ts

#### 50. Helmet 安全头
**修复**: 安装 `helmet`，在 `main.ts` 中 `app.use(helmet())`，添加 XSS/Content-Type-Sniffing/Frame 等安全头
**文件**: server/src/main.ts, server/package.json

### 更新对比表

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| 竞态条件 | 无唯一约束 + 事务外检查 | @@unique 约束 + 事务内检查 + P2002 处理 |
| 自动交卷 | 仅弹确认框 | 定时器直接提交 (force=true) |
| JWT 密钥 | 5 处硬编码回退 | 启动时必须设置，无回退 |
| 健康检查 | 无 | GET /api/health |
| 文件上传 | 无大小限制 | 10MB 限制 |
| 环境变量 | 无校验 | 启动时校验 |
| 日志 | console.log | NestJS Logger |
| 测试 | 0 | 3 个 e2e smoke test |
| API 文档 | 无 | Swagger /api/docs |
| CI/CD | 无 | GitHub Actions |
| 种子密码 | 明文硬编码 | 环境变量 |
| 安全头 | 无 | Helmet (CSP/XSS/Frame) |

## 十二、最终项目规模

| 指标 | 数量 |
|------|------|
| 总源文件 | 70 个 |
| REST 端点 | 31 个 (+1 health) |
| WebSocket 事件 | 3 个 |
| 数据库表 | 14 张 |
| 数据库索引 | 17 个 |
| 共享 DTO | 16 个 |
| 管理端页面 | 9 个 (懒加载) |
| 答题端页面 + 组件 | 6 个 (懒加载) |
| e2e 测试 | 3 个 |
| GitHub Actions | 1 个 workflow |
