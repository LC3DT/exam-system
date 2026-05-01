import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) { console.log('Admin not found, run seed first'); return; }

  const existing = await prisma.question.count({ where: { status: 'published' } });
  if (existing >= 45) { console.log(`Already ${existing} questions, skip`); return; }

  const questions: any[] = [
    // ========== JavaScript (8题) ==========
    { type: 'single', content: { text: '以下哪个方法可以将 JSON 字符串转换为 JavaScript 对象？' }, options: [{ label: 'A', content: 'JSON.stringify()' }, { label: 'B', content: 'JSON.parse()' }, { label: 'C', content: 'JSON.convert()' }, { label: 'D', content: 'JSON.toObject()' }], answer: { correct: 'B' }, knowledgePoint: 'JavaScript基础', difficulty: 0.2, estimatedTime: 30, tags: ['JavaScript', 'JSON'] },
    { type: 'single', content: { text: 'let a = [1, 2, 3]; let b = a; b.push(4); console.log(a.length); 输出结果是什么？' }, options: [{ label: 'A', content: '3' }, { label: 'B', content: '4' }, { label: 'C', content: 'undefined' }, { label: 'D', content: '报错' }], answer: { correct: 'B' }, knowledgePoint: 'JavaScript基础', difficulty: 0.35, estimatedTime: 45, tags: ['JavaScript', '数组'] },
    { type: 'multiple', content: { text: '以下哪些是 ES6 新增的特性？' }, options: [{ label: 'A', content: '箭头函数' }, { label: 'B', content: 'Promise' }, { label: 'C', content: 'eval()' }, { label: 'D', content: 'let/const' }], answer: { correct: ['A', 'B', 'D'] }, knowledgePoint: 'JavaScript进阶', difficulty: 0.4, estimatedTime: 50, tags: ['JavaScript', 'ES6'] },
    { type: 'multiple', content: { text: '以下哪些会导致 JavaScript 内存泄漏？' }, options: [{ label: 'A', content: '未清除的定时器' }, { label: 'B', content: '全局变量滥用' }, { label: 'C', content: '闭包引用' }, { label: 'D', content: '使用 const 声明变量' }], answer: { correct: ['A', 'B', 'C'] }, knowledgePoint: 'JavaScript进阶', difficulty: 0.7, estimatedTime: 60, tags: ['JavaScript', '内存'] },
    { type: 'judge', content: { text: 'JavaScript 中 0.1 + 0.2 === 0.3 的结果是 true。' }, answer: { correct: false }, knowledgePoint: 'JavaScript基础', difficulty: 0.45, estimatedTime: 25, tags: ['JavaScript', '浮点数'] },
    { type: 'judge', content: { text: 'Promise.all 只要有一个 reject 就会立即失败。' }, answer: { correct: true }, knowledgePoint: 'JavaScript进阶', difficulty: 0.5, estimatedTime: 30, tags: ['JavaScript', 'Promise'] },
    { type: 'fill', content: { text: '使用 ____ 关键字可以暂停 async 函数的执行，等待 Promise 完成。' }, answer: { correct: 'await' }, knowledgePoint: 'JavaScript进阶', difficulty: 0.3, estimatedTime: 30, tags: ['JavaScript', 'async'] },
    { type: 'essay', content: { text: '请解释 JavaScript 中的事件循环（Event Loop）机制，包括宏任务和微任务的区别。' }, answer: { correct: '' }, knowledgePoint: 'JavaScript进阶', difficulty: 0.75, estimatedTime: 420, tags: ['JavaScript', '事件循环'] },

    // ========== HTML/CSS (6题) ==========
    { type: 'single', content: { text: 'CSS 中，以下哪个属性可以设置元素为弹性布局？' }, options: [{ label: 'A', content: 'display: flex' }, { label: 'B', content: 'display: block' }, { label: 'C', content: 'position: relative' }, { label: 'D', content: 'float: left' }], answer: { correct: 'A' }, knowledgePoint: 'CSS基础', difficulty: 0.15, estimatedTime: 25, tags: ['CSS', '布局'] },
    { type: 'single', content: { text: 'HTML5 中用于播放视频的正确标签是？' }, options: [{ label: 'A', content: '<media>' }, { label: 'B', content: '<movie>' }, { label: 'C', content: '<video>' }, { label: 'D', content: '<player>' }], answer: { correct: 'C' }, knowledgePoint: 'HTML基础', difficulty: 0.1, estimatedTime: 20, tags: ['HTML', 'HTML5'] },
    { type: 'multiple', content: { text: '以下哪些 CSS 选择器的优先级高于类选择器？' }, options: [{ label: 'A', content: 'ID 选择器' }, { label: 'B', content: '内联样式' }, { label: 'C', content: '标签选择器' }, { label: 'D', content: '!important' }], answer: { correct: ['A', 'B', 'D'] }, knowledgePoint: 'CSS进阶', difficulty: 0.55, estimatedTime: 50, tags: ['CSS', '选择器'] },
    { type: 'judge', content: { text: 'CSS Grid 布局可以同时处理行和列的布局，功能强于 Flexbox。' }, answer: { correct: true }, knowledgePoint: 'CSS进阶', difficulty: 0.5, estimatedTime: 30, tags: ['CSS', 'Grid'] },
    { type: 'judge', content: { text: 'HTML 中 id 属性值在同一页面中可以重复使用。' }, answer: { correct: false }, knowledgePoint: 'HTML基础', difficulty: 0.1, estimatedTime: 20, tags: ['HTML', '基础'] },
    { type: 'fill', content: { text: 'CSS 中设置元素透明度使用 ____ 属性。' }, answer: { correct: 'opacity' }, knowledgePoint: 'CSS基础', difficulty: 0.15, estimatedTime: 25, tags: ['CSS'] },

    // ========== HTTP/网络 (6题) ==========
    { type: 'single', content: { text: 'HTTP 状态码 404 表示什么？' }, options: [{ label: 'A', content: '服务器错误' }, { label: 'B', content: '资源未找到' }, { label: 'C', content: '请求成功' }, { label: 'D', content: '需要认证' }], answer: { correct: 'B' }, knowledgePoint: 'HTTP协议', difficulty: 0.15, estimatedTime: 25, tags: ['HTTP', '状态码'] },
    { type: 'single', content: { text: 'HTTPS 默认使用哪个端口？' }, options: [{ label: 'A', content: '80' }, { label: 'B', content: '8080' }, { label: 'C', content: '443' }, { label: 'D', content: '3306' }], answer: { correct: 'C' }, knowledgePoint: 'HTTP协议', difficulty: 0.2, estimatedTime: 20, tags: ['HTTP', 'HTTPS'] },
    { type: 'multiple', content: { text: '以下哪些属于 HTTP 请求头字段？' }, options: [{ label: 'A', content: 'Content-Type' }, { label: 'B', content: 'Authorization' }, { label: 'C', content: '<html>' }, { label: 'D', content: 'User-Agent' }], answer: { correct: ['A', 'B', 'D'] }, knowledgePoint: 'HTTP协议', difficulty: 0.4, estimatedTime: 45, tags: ['HTTP'] },
    { type: 'judge', content: { text: 'WebSocket 是全双工通信协议，可以在一条连接上同时收发数据。' }, answer: { correct: true }, knowledgePoint: '网络协议', difficulty: 0.35, estimatedTime: 25, tags: ['网络', 'WebSocket'] },
    { type: 'judge', content: { text: 'DNS 协议使用 TCP 端口 53 进行域名解析。' }, answer: { correct: false }, knowledgePoint: '网络协议', difficulty: 0.6, estimatedTime: 30, tags: ['网络', 'DNS'] },
    { type: 'essay', content: { text: '请简述 TCP 三次握手和四次挥手的过程，并说明为什么需要三次握手而不是两次。' }, answer: { correct: '' }, knowledgePoint: '网络协议', difficulty: 0.7, estimatedTime: 360, tags: ['网络', 'TCP'] },

    // ========== React (6题) ==========
    { type: 'single', content: { text: 'React 中哪个 Hook 用于在函数组件中执行副作用操作？' }, options: [{ label: 'A', content: 'useState' }, { label: 'B', content: 'useEffect' }, { label: 'C', content: 'useContext' }, { label: 'D', content: 'useReducer' }], answer: { correct: 'B' }, knowledgePoint: 'React', difficulty: 0.25, estimatedTime: 30, tags: ['React', 'Hooks'] },
    { type: 'single', content: { text: 'React 中 key 属性的主要作用是什么？' }, options: [{ label: 'A', content: '设置组件样式' }, { label: 'B', content: '帮助 React 识别列表元素的变化' }, { label: 'C', content: '定义组件的唯一名称' }, { label: 'D', content: '控制组件的渲染顺序' }], answer: { correct: 'B' }, knowledgePoint: 'React', difficulty: 0.35, estimatedTime: 35, tags: ['React', '列表'] },
    { type: 'multiple', content: { text: '以下哪些方法可以避免 React 组件不必要的重新渲染？' }, options: [{ label: 'A', content: 'React.memo' }, { label: 'B', content: 'useMemo' }, { label: 'C', content: 'useCallback' }, { label: 'D', content: 'setInterval' }], answer: { correct: ['A', 'B', 'C'] }, knowledgePoint: 'React', difficulty: 0.6, estimatedTime: 50, tags: ['React', '性能'] },
    { type: 'fill', content: { text: 'React 中使用 ____ 可以跨组件层级传递数据，避免逐层 props 传递。' }, answer: { correct: 'useContext' }, knowledgePoint: 'React', difficulty: 0.4, estimatedTime: 35, tags: ['React', 'Context'] },
    { type: 'essay', content: { text: '请比较 React 类组件和函数组件的区别，以及 Hooks 带来的变化。' }, answer: { correct: '' }, knowledgePoint: 'React', difficulty: 0.55, estimatedTime: 300, tags: ['React', 'Hooks'] },
    { type: 'essay', content: { text: '请简述 Virtual DOM 的工作原理及其性能优势。' }, answer: { correct: '' }, knowledgePoint: 'React', difficulty: 0.65, estimatedTime: 360, tags: ['React', 'VirtualDOM'] },

    // ========== 数据库/SQL (6题) ==========
    { type: 'single', content: { text: 'SQL 中，哪个关键字用于从表中删除所有行但保留表结构？' }, options: [{ label: 'A', content: 'DELETE FROM table' }, { label: 'B', content: 'DROP TABLE table' }, { label: 'C', content: 'REMOVE FROM table' }, { label: 'D', content: 'TRUNCATE TABLE table' }], answer: { correct: 'A' }, knowledgePoint: '数据库SQL', difficulty: 0.35, estimatedTime: 40, tags: ['SQL', 'DML'] },
    { type: 'single', content: { text: '在 MySQL 中，InnoDB 存储引擎默认使用什么索引结构？' }, options: [{ label: 'A', content: 'Hash 索引' }, { label: 'B', content: 'B+ 树索引' }, { label: 'C', content: '全文索引' }, { label: 'D', content: 'R 树索引' }], answer: { correct: 'B' }, knowledgePoint: '数据库SQL', difficulty: 0.6, estimatedTime: 50, tags: ['MySQL', '索引'] },
    { type: 'multiple', content: { text: '以下哪些是数据库事务的 ACID 特性？' }, options: [{ label: 'A', content: '原子性 (Atomicity)' }, { label: 'B', content: '一致性 (Consistency)' }, { label: 'C', content: '可见性 (Visibility)' }, { label: 'D', content: '持久性 (Durability)' }], answer: { correct: ['A', 'B', 'D'] }, knowledgePoint: '数据库SQL', difficulty: 0.5, estimatedTime: 50, tags: ['SQL', '事务'] },
    { type: 'judge', content: { text: 'LEFT JOIN 会返回左表的所有行，即使在右表中没有匹配。' }, answer: { correct: true }, knowledgePoint: '数据库SQL', difficulty: 0.3, estimatedTime: 30, tags: ['SQL', 'JOIN'] },
    { type: 'judge', content: { text: '数据库索引越多查询速度越快，应该为所有列都建立索引。' }, answer: { correct: false }, knowledgePoint: '数据库SQL', difficulty: 0.55, estimatedTime: 35, tags: ['SQL', '索引'] },
    { type: 'fill', content: { text: 'SQL 中使用 ____ 命令可以创建数据库索引。' }, answer: { correct: 'CREATE INDEX' }, knowledgePoint: '数据库SQL', difficulty: 0.3, estimatedTime: 30, tags: ['SQL', '索引'] },

    // ========== Linux/操作系统 (6题) ==========
    { type: 'single', content: { text: 'Linux 中，哪个命令用于列出目录中的文件？' }, options: [{ label: 'A', content: 'ls' }, { label: 'B', content: 'cd' }, { label: 'C', content: 'pwd' }, { label: 'D', content: 'cat' }], answer: { correct: 'A' }, knowledgePoint: 'Linux基础', difficulty: 0.1, estimatedTime: 20, tags: ['Linux', '命令'] },
    { type: 'single', content: { text: 'Linux 中，文件权限 755 表示什么？' }, options: [{ label: 'A', content: '所有者可读写执行，组和他人只读' }, { label: 'B', content: '所有者可读写执行，组和他人可读写执行' }, { label: 'C', content: '所有者只读，组和他人不可访问' }, { label: 'D', content: '所有人可读写执行' }], answer: { correct: 'A' }, knowledgePoint: 'Linux基础', difficulty: 0.4, estimatedTime: 40, tags: ['Linux', '权限'] },
    { type: 'judge', content: { text: 'Linux 中 root 用户的 UID 是 0。' }, answer: { correct: true }, knowledgePoint: 'Linux基础', difficulty: 0.2, estimatedTime: 20, tags: ['Linux', '用户'] },
    { type: 'judge', content: { text: '操作系统中，死锁的四个必要条件是：互斥、持有并等待、不可抢占、循环等待。' }, answer: { correct: true }, knowledgePoint: '操作系统', difficulty: 0.6, estimatedTime: 30, tags: ['操作系统', '死锁'] },
    { type: 'fill', content: { text: 'Linux 中查看进程信息的命令是 ____。' }, answer: { correct: 'ps' }, knowledgePoint: 'Linux进阶', difficulty: 0.2, estimatedTime: 25, tags: ['Linux', '进程'] },
    { type: 'essay', content: { text: '请解释操作系统中的进程与线程的区别，以及各自的优势。' }, answer: { correct: '' }, knowledgePoint: '操作系统', difficulty: 0.55, estimatedTime: 300, tags: ['操作系统', '进程线程'] },

    // ========== 安全基础 (2题) ==========
    { type: 'multiple', content: { text: '以下哪些是常见的 Web 安全攻击方式？' }, options: [{ label: 'A', content: 'XSS（跨站脚本攻击）' }, { label: 'B', content: 'CSRF（跨站请求伪造）' }, { label: 'C', content: 'SQL 注入' }, { label: 'D', content: 'DNS 缓存中毒' }], answer: { correct: ['A', 'B', 'C', 'D'] }, knowledgePoint: '安全基础', difficulty: 0.5, estimatedTime: 45, tags: ['安全', 'Web'] },
    { type: 'judge', content: { text: '在 HTTPS 通信中，数据在传输过程中是加密的，因此不需要对输入数据进行服务端验证。' }, answer: { correct: false }, knowledgePoint: '安全基础', difficulty: 0.45, estimatedTime: 30, tags: ['安全', 'HTTPS'] },
  ];

  let added = 0;
  for (const q of questions) {
    try {
      await prisma.question.create({
        data: {
          type: q.type,
          content: JSON.stringify(q.content),
          options: q.options ? JSON.stringify(q.options) : null,
          answer: JSON.stringify(q.answer),
          knowledgePoint: q.knowledgePoint,
          difficulty: q.difficulty,
          estimatedTime: q.estimatedTime,
          tags: JSON.stringify(q.tags),
          creatorId: admin.id,
          status: 'published',
        },
      });
      added++;
    } catch (e) {
      console.log('Skip duplicate or error:', (q.content as any).text?.slice(0, 30), e.message);
    }
  }

  const total = await prisma.question.count({ where: { status: 'published' } });
  console.log(`Added ${added} questions. Total: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
