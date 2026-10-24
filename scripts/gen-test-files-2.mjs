/**
 * 第二批测试资料（第二门课程「数据结构」+ 边界用例）
 * 运行：node scripts/gen-test-files-2.mjs（扫描件 PNG 需先跑 scripts/gen-scan-pages-2.ps1）
 */
import fs from "node:fs";
import path from "node:path";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const OUT = path.join(process.cwd(), "test");
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 数据结构内容 ---------- */

const LINEAR = {
  intro: [
    "线性表是最基本的数据结构，是 n 个具有相同性质数据元素的有限序列。顺序表用一段连续存储单元依次存放元素，支持随机存取，按位读取时间复杂度为 O(1)，但插入删除需要移动平均一半元素，复杂度 O(n)。",
    "链表通过指针链接结点，存储不必连续。单链表插入删除只需修改指针，定位到位置后操作为 O(1)，但按位查找必须从头遍历，复杂度 O(n)。带头结点的写法可以统一处理表头位置的特殊情况。",
    "循环链表让尾结点指向头结点，从任意结点出发都能遍历全表；双向链表每个结点含 prior 与 next 两个指针，可以双向遍历，代价是每个结点多一个指针域的空间。",
  ],
  stack: [
    "栈是只允许在一端（栈顶）进行插入删除的线性表，后进先出 LIFO。顺序栈用 top 指示栈顶；链栈的头结点即栈顶。入栈出栈均为 O(1)。",
    "栈的典型应用：括号匹配、表达式求值（中缀转后缀）、递归的底层实现、深度优先搜索 DFS、浏览器的后退功能。",
    "中缀转后缀规则：操作数直接输出；运算符与栈顶比较优先级，高于则入栈，否则弹栈输出；左括号入栈，右括号弹出至左括号为止。",
  ],
  queue: [
    "队列只允许队尾入队、队头出队，先进先出 FIFO。顺序队列用循环方式解决假溢出：判满条件 (rear+1)%maxSize == front，牺牲一个存储单元。",
    "队列典型应用：操作系统的作业调度、广度优先搜索 BFS、打印任务队列、消息缓冲区。",
  ],
  tree: [
    "二叉树是每个结点至多有两棵子树的树结构。满二叉树每层都满；完全二叉树只允许最后一层缺右侧连续若干结点。",
    "二叉树性质：第 i 层至多 2^(i-1) 个结点；深度为 k 的二叉树至多 2^k - 1 个结点；n0 = n2 + 1（叶子数等于度 2 结点数加一）。",
    "遍历方式：先序（根左右）、中序（左根右）、后序（左右根）、层序（队列辅助）。已知中序与任一遍历可唯一确定二叉树。",
    "二叉排序树 BST：左子树关键字小于根小于右子树，中序遍历得到升序序列。平衡因子绝对值超过 1 时需 LL、RR、LR、RL 四种旋转调整。",
    "哈夫曼树：带权路径长度 WPL 最小的二叉树。构造方式为反复选取权值最小的两棵树合并；哈夫曼编码是前缀编码，可用于数据压缩。",
  ],
  formulas: [
    "顺序表插入平均移动次数 $\\frac{n}{2}$，删除平均移动次数 $\\frac{n-1}{2}$。",
    "完全二叉树结点数为 n 时，深度 $h = \\lceil \\log_2(n+1) \\rceil$。",
    "哈夫曼树 WPL $= \\sum_{i=1}^{n} w_i l_i$，其中 $w_i$ 为权值，$l_i$ 为路径长度。",
    "快速排序平均比较次数 $O(n \\log n)$，递推式 $T(n) = 2T(n/2) + cn$。",
  ],
};

const SORT = [
  ["排序概览", ["为什么要学排序：工程中使用频率最高的算法族", "评价指标：时间复杂度、空间复杂度、稳定性"]],
  ["插入排序", ["直接插入：把第 i 个元素插入前面有序区", "折半插入：用二分找位置，减少比较但不减移动", "希尔排序：增量分组，最后一趟增量为 1"]],
  ["交换排序", ["冒泡排序：相邻比较交换，一趟定一个最大值", "快速排序：划分思想，平均 O(n log n) 最快之一"]],
  ["选择排序", ["简单选择：每趟选最小放前面", "堆排序：大顶堆 + 下沉调整，空间 O(1)"]],
  ["归并排序", ["二路归并：分治到最小再合并", "稳定且性能稳定，外排序的基础"]],
  ["基数排序", ["多关键字排序：按位分配收集", "时间 O(d(n+r))，适合整数/字符串"]],
  ["对比总结", ["稳定：插入、冒泡、归并、基数", "不稳定：选择、希尔、快排、堆排", "n<50 插入；求稳定归并；省内存堆排"]],
];

/* ---------- 1. Markdown（公式密集，测 KaTeX） ---------- */

function genMd() {
  const lines = [
    "# 数据结构 · 核心公式与复杂度速查",
    "",
    "> 配合《数据结构（C 语言版）》第 2-9 章使用；行内公式 $c$ 与块级公式都可能出现。",
    "",
    "## 1. 线性表",
    "",
    ...LINEAR.intro.map((p) => `${p}\n`),
    "## 2. 栈与队列",
    "",
    ...LINEAR.stack.map((p) => `- ${p}`),
    ...LINEAR.queue.map((p) => `- ${p}`),
    "",
    "## 3. 树与二叉树",
    "",
    ...LINEAR.tree.map((p) => `${p}\n`),
    "## 4. 关键公式",
    "",
    ...LINEAR.formulas.map((f) => `- ${f}`),
    "",
    "## 5. 常用结论表",
    "",
    "| 结构 | 查找 | 插入 | 删除 |",
    "|---|---|---|---|",
    "| 顺序表 | $O(1)$ | $O(n)$ | $O(n)$ |",
    "| 单链表 | $O(n)$ | $O(1)$ | $O(1)$ |",
    "| BST 平均 | $O(\\log n)$ | $O(\\log n)$ | $O(\\log n)$ |",
    "| 哈希表 | $O(1)$ | $O(1)$ | $O(1)$ |",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "数据结构-公式与复杂度速查.md"), lines, "utf8");
}

/* ---------- 2. 超长 TXT（无标题单段，测分块器硬切路径） ---------- */

function genLongTxt() {
  const points = [
    "考点：顺序表按位存取为 O(1)，插入删除需移动元素，适合读多写少场景。",
    "考点：链表不能随机存取，但插删只需改指针，适合频繁增删场景。",
    "考点：循环队列判满用牺牲一个单元法，队空条件 front==rear，队满条件 (rear+1)%max==front。",
    "考点：中缀转后缀用运算符栈，优先级高的先输出；后缀表达式求值用操作数栈。",
    "考点：n 个结点的二叉树有 n-1 条边；二叉树中 n0 = n2 + 1。",
    "考点：哈夫曼树没有度为 1 的结点；n 个叶子的哈夫曼树共 2n-1 个结点。",
    "考点：图的深度优先遍历用栈，广度优先遍历用队列。",
    "考点：邻接矩阵存无向图空间为 n²，邻接表为 n+2e；稠密图用矩阵，稀疏图用表。",
    "考点：折半查找要求顺序存储且有序，判定树形态唯一，平均查找长度约 log2(n+1)-1。",
    "考点：散列冲突处理：开放定址（线性探测、二次探测、再哈希）与链地址法；装填因子越大冲突越多。",
    "考点：直接插入排序稳定；快速排序空间复杂度平均 log2n（递归栈），最坏 n。",
    "考点：堆的建立自底向上为 O(n)；建小顶堆输出升序，堆顶与末尾交换后需下沉调整。",
    "考点：归并排序需要 O(n) 辅助数组，k 路归并的比较次数与 k 有关，败者树可优化。",
    "考点：拓扑排序用于 AOV 网，每次选入度 0 的顶点；关键路径在 AOE 网上求最长路径。",
    "考点：KMP 的 next 数组本质是最长相同前后缀，主串指针不回溯，模式串指针按 next 回退。",
  ];
  const parts = ["数据结构期中考点速记（自动生成的长文本，用于测试无结构长文档的分块）", ""];
  for (let round = 1; round <= 10; round++) {
    parts.push(`===== 第 ${round} 轮背诵 =====`);
    for (const p of points) parts.push(p);
    parts.push("");
  }
  fs.writeFileSync(path.join(OUT, "数据结构-考点速记长文.txt"), parts.join("\n"), "utf8");
}

/* ---------- 3. DOCX（含表格，测 mammoth 表格路径） ---------- */

async function genDocx() {
  const cell = (t, opts = {}) =>
    new TableCell({
      children: [new Paragraph({ text: t, ...opts })],
      width: { size: 25, type: WidthType.PERCENTAGE },
    });
  const children = [
    new Paragraph({ text: "数据结构实验指导 · 栈与队列", heading: HeadingLevel.HEADING_1 }),
    new Paragraph("本实验指导书配套第 3 章，共 4 个学时。实验报告需附测试用例与复杂度分析。"),
    new Paragraph({ text: "实验一 括号匹配", heading: HeadingLevel.HEADING_2 }),
    new Paragraph("用顺序栈实现：左括号入栈，右括号弹栈比对；栈空遇到右括号或结束时栈非空均为失败。"),
    new Paragraph({ text: "实验二 后缀表达式求值", heading: HeadingLevel.HEADING_2 }),
    new Paragraph("扫描后缀表达式：操作数入栈；运算符弹出两个操作数计算后回压；结束时栈顶即答案。"),
    new Paragraph({ text: "实验三 循环队列", heading: HeadingLevel.HEADING_2 }),
    new Paragraph("实现入队、出队、判空、判满；注意判满牺牲一个单元的约定，并解释假溢出如何被消除。"),
    new Paragraph({ text: "实验安排", heading: HeadingLevel.HEADING_2 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell("实验", { bold: true }), cell("内容", { bold: true }),
            cell("学时", { bold: true }), cell("提交物", { bold: true }),
          ],
        }),
        new TableRow({ children: [cell("实验一"), cell("括号匹配"), cell("1"), cell("源码+截图")] }),
        new TableRow({ children: [cell("实验二"), cell("后缀求值"), cell("1.5"), cell("源码+报告")] }),
        new TableRow({ children: [cell("实验三"), cell("循环队列"), cell("1.5"), cell("源码+报告")] }),
      ],
    }),
    new Paragraph({ text: "评分标准", heading: HeadingLevel.HEADING_2 }),
    new Paragraph("正确性 60 分，边界用例 20 分，代码规范与注释 20 分。"),
  ];
  const doc = new Document({ sections: [{ children }] });
  fs.writeFileSync(path.join(OUT, "数据结构实验指导-栈与队列.docx"), await Packer.toBuffer(doc));
}

/* ---------- 4. PPTX（排序算法，14 页） ---------- */

async function genPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  const slides = [
    ["第 9 章 排序", ["排序的两大指标：时间与稳定性", "本章要求：手写插入/快排/归并/堆排"]],
    ...SORT.flatMap(([title, bullets]) => [
      [`${title}（要点）`, [bullets[0]]],
      [`${title}（展开）`, bullets.slice(1).length ? bullets.slice(1) : ["细节结合课件与讲义复习"]],
    ]),
    ["课后作业", ["手工模拟快排一趟划分（期末必考）", "证明归并最坏比较次数 n⌈log n⌉ - 2^⌈log n⌉ + 1"]],
  ];
  for (const [title, bullets] of slides) {
    const s = pptx.addSlide();
    s.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 26, bold: true, color: "22242D" });
    s.addText(bullets.map((t) => ({ text: t, options: { bullet: true } })), {
      x: 0.7, y: 1.3, w: 8.6, h: 3.6, fontSize: 15, color: "5D6170", lineSpacing: 26,
    });
  }
  await pptx.writeFile({ fileName: path.join(OUT, "第9章-排序算法.pptx") });
}

/* ---------- 5. 大 PDF（约 36 页，线性表+栈+队列+树） ---------- */

async function genBigPdf() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fs.readFileSync("C:\\Windows\\Fonts\\simhei.ttf"), { subset: true });
  const size = 11;
  const W = 595, H = 842, M = 56, LINE = 22, CHARS = 40;
  const wrap = (text) => {
    const out = [];
    for (let i = 0; i < text.length; i += CHARS) out.push(text.slice(i, i + CHARS));
    return out;
  };

  const sections = [
    ["2.1 线性表的定义与顺序表", LINEAR.intro],
    ["2.2 链表家族", [
      "单链表的结点由数据域与指针域组成。头插法建表逆序、尾插法保序。查找第 i 个结点需从头指针走 i-1 步。",
      "循环链表与双向链表：循环链表尾指针指向头，便于从尾部出发的合并操作；双向链表插入删除需同时修改两个方向的指针，注意语句次序。",
    ]],
    ["3.1 栈", LINEAR.stack],
    ["3.2 队列", LINEAR.queue],
    ["5.1 二叉树的概念与性质", LINEAR.tree.slice(0, 3)],
    ["5.2 二叉排序树与平衡", LINEAR.tree.slice(3)],
    ["5.3 哈夫曼树", [LINEAR.tree[4], LINEAR.formulas[2]]],
    ["附录 复习要求", [
      "1. 手工模拟：中缀转后缀、快排一趟划分、哈夫曼构造过程。",
      "2. 计算题：循环队列指针变化、完全二叉树结点计数、散列冲突次数。",
      "3. 证明题：n0 = n2 + 1；哈夫曼树无度 1 结点。",
    ]],
  ];

  let page = null;
  let y = 0;
  const newPage = (title) => {
    page = doc.addPage([W, H]);
    y = H - M;
    for (const line of wrap(title)) {
      page.drawText(line, { x: M, y, size: 16, font, color: rgb(0.13, 0.14, 0.18) });
      y -= 30;
    }
    y -= 8;
  };
  const putPara = (text) => {
    for (const line of wrap(text)) {
      if (y < M + LINE) newPage("（续）");
      page.drawText(line, { x: M, y, size, font, color: rgb(0.2, 0.22, 0.28) });
      y -= LINE;
    }
    y -= 10;
  };

  for (const [title, paras] of sections) {
    newPage(title);
    // 每节重复展开 8 遍（后几遍加关键词复述行），把篇幅撑到 30+ 页，测试较长 PDF 的分块与页码引用
    for (let round = 1; round <= 8; round++) {
      for (const p of paras) {
        putPara(round === 1 ? p : `（第 ${round} 遍复习）${p}`);
        if (round > 1) {
          putPara(`关键词复述：${p.slice(0, 14)}…… 默写检查：能否不看书说出该段两个术语？`);
        }
      }
      putPara(`—— 本节第 ${round} 遍结束，回看标题确认能否复述要点 ——`);
    }
  }
  fs.writeFileSync(path.join(OUT, "数据结构讲义-线性表到哈夫曼.pdf"), await doc.save());
}

/* ---------- 6. 扫描件 PDF（数据结构板书照片，无文字层） ---------- */

async function genScanPdf() {
  const pngs = ["ds-scan-page-1.png", "ds-scan-page-2.png"]
    .map((f) => path.join(OUT, "assets", f))
    .filter((f) => fs.existsSync(f));
  if (pngs.length === 0) throw new Error("缺少 ds-scan PNG，请先运行 scripts/gen-scan-pages-2.ps1");
  const doc = await PDFDocument.create();
  for (const png of pngs) {
    const img = await doc.embedPng(fs.readFileSync(png));
    const page = doc.addPage([595, 842]);
    page.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
  }
  fs.writeFileSync(path.join(OUT, "扫描件-排序板书.pdf"), await doc.save());
}

/* ---------- 7. 边界用例 ---------- */

function genEdgeCases() {
  // 空文件（解析应报错）
  fs.writeFileSync(path.join(OUT, "空文档.txt"), "", "utf8");
  // 伪 PDF（内容不是 PDF，解析应报错）
  fs.writeFileSync(path.join(OUT, "损坏文件.pdf"), "this file is not a real pdf, just plain text bytes.", "utf8");
  // 极短 MD（不足一块）
  fs.writeFileSync(path.join(OUT, "一句话笔记.md"), "# 一句话\n\n栈是后进先出的线性表。\n", "utf8");
}

/* ---------- 执行 ---------- */

await genMd();
await genLongTxt();
await genDocx();
await genPptx();
await genBigPdf();
await genScanPdf();
genEdgeCases();
console.log(
  "batch-2 generated:",
  fs.readdirSync(OUT).filter((f) => f !== "assets").join(", ")
);
