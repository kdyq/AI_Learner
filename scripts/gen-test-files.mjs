/**
 * 生成 M2 验收用测试文件（中文为主的操作系统课程资料）
 * 运行：node scripts/gen-test-files.mjs（扫描件 PNG 需先跑 scripts/gen-scan-pages.ps1）
 */
import fs from "node:fs";
import path from "node:path";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const OUT = path.join(process.cwd(), "test");
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 共享内容（操作系统 · 处理机调度与死锁） ---------- */

const SCHED = {
  intro: [
    "处理机调度是操作系统的核心功能之一，其任务是从就绪队列中选择一个进程，把处理机分配给它。三级调度模型包括高级调度（作业调度）、中级调度（内存调度）和低级调度（进程调度）。",
    "高级调度从外存的后备队列中选择作业调入内存，创建进程，频率最低；中级调度将暂时不能运行的进程换出到外存，负责内存与外存之间的对换；低级调度决定内存中就绪队列的哪个进程获得处理机，频率最高，是操作系统中最基本的一种调度。",
  ],
  algorithms: [
    "先来先服务（FCFS）：按到达顺序调度，非抢占。有利于长作业、CPU 繁忙型作业，不利于短作业；会导致护航效应，短作业等待长作业。",
    "短作业优先（SJF）：选运行时间最短的作业，平均等待时间最短，但长作业可能饥饿；作业运行时间难以准确估计。",
    "最短剩余时间优先（SRTN）：SJF 的抢占版本，新进程到达时比较剩余时间，实现复杂。",
    "高响应比优先（HRRN）：响应比 R = (等待时间 + 要求服务时间) / 要求服务时间，综合了 FCFS 和 SJF 的优点，克服了饥饿，但每次调度需要计算响应比。",
    "时间片轮转（RR）：按 FCFS 排成就绪队列，时间片用完即剥夺。时间片过大退化为 FCFS，过小时上下文切换开销增大。",
    "优先级调度：按优先级选择进程，可分为静态优先级与动态优先级，可能产生低优先级进程饥饿，可通过老化技术解决。",
    "多级反馈队列调度（MLFQ）：设置多个优先级递减、时间片递增的就绪队列，新进程进入最高队列，用完时间片降级；不必事先知道执行时间，是目前公认较好的进程调度算法，UNIX 与 Windows 均采用其变体。",
  ],
  metrics: [
    "调度性能指标：CPU 利用率、吞吐量、周转时间（完成时间 - 到达时间）、带权周转时间（周转时间 / 服务时间）、等待时间、响应时间。",
    "实时调度分为硬实时与软实时：硬实时必须绝对满足截止时间，软实时允许偶尔违约。最早截止时间优先 EDF 是经典的动态实时调度算法。",
  ],
};

const DEADLOCK = [
  "死锁的定义：多个进程因竞争资源而造成的一种互相等待的僵局，若无外力作用，这些进程都无法再向前推进。",
  "死锁产生的四个必要条件：互斥条件、请求和保持条件、不可剥夺条件、循环等待条件。",
  "处理死锁的四种策略：预防死锁、避免死锁、检测死锁与解除死锁。",
  "预防死锁通过破坏四个必要条件之一实现：一次性申请全部资源（破坏请求保持）、资源可剥夺（破坏不可剥夺）、资源顺序分配（破坏循环等待）。",
  "避免死锁的经典算法是银行家算法：在进程申请资源时，先试探性分配，再检查系统是否处于安全状态；若找不到安全序列则拒绝分配。安全状态指系统能按某种顺序为每个进程分配所需资源直至完成。",
  "死锁定理：系统状态图完全化简则无死锁；不能化简的进程集合即死锁进程。",
  "解除死锁的方法：资源剥夺、撤销进程。选择牺牲进程时考虑优先级、已运行时间、已用资源量等因素。",
];

const FORMULAS = [
  "周转时间 $T = T_{完成} - T_{到达}$，带权周转时间 $W = T / T_s$。",
  "响应比 $R = \\frac{W + S}{S}$，其中 $W$ 为等待时间，$S$ 为要求服务时间。",
  "CPU 利用率 $\\eta = \\frac{\\text{繁忙时间}}{\\text{总时间}} \\times 100\\%$。",
];

/* ---------- 1. Markdown ---------- */

function genMd() {
  const lines = [
    "# 操作系统 · 处理机调度复习笔记",
    "",
    `> 本笔记覆盖第 4 章处理机调度的核心考点，配合 Chapter3 讲义与课堂 PPT 使用。`,
    "",
    "## 1. 三级调度体系",
    "",
    ...SCHED.intro.map((p) => `${p}\n`),
    "## 2. 调度算法对比",
    "",
    ...SCHED.algorithms.map((p) => `- ${p}`),
    "",
    "## 3. 性能指标与公式",
    "",
    ...SCHED.metrics.map((p) => `${p}\n`),
    ...FORMULAS.map((f) => `${f}\n`),
    "## 4. 课后重点",
    "",
    "1. 能够手工模拟 RR 与 HRRN 的调度过程并计算平均周转时间。",
    "2. 理解 MLFQ 如何在交互性与吞吐量之间取得平衡。",
    "3. 掌握 EDF 算法在实时系统中的应用场景。",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "操作系统-处理机调度笔记.md"), lines, "utf8");
}

/* ---------- 2. TXT ---------- */

function genTxt() {
  const lines = [
    "操作系统期中复习提纲（草稿）",
    "",
    "一、进程与线程",
    "进程是程序的一次执行，是资源分配的基本单位；线程是调度的基本单位。进程由 PCB 唯一标识，包含 PID、状态、程序计数器、寄存器上下文与内存管理信息。",
    "进程五种状态：创建、就绪、运行、阻塞、终止。挂起态用于中级调度。",
    "线程分为用户级线程与内核级线程，多对一模型中一个线程阻塞会阻塞整个进程。",
    "",
    "二、同步与互斥",
    "临界区互斥的四个原则：空闲让进、忙则等待、有限等待、让权等待。",
    "信号量机制：P 操作申请资源，V 操作释放资源；实现互斥时信号量初值为 1，实现同步时初值为资源数量。",
    "经典问题：生产者-消费者、读者-写者、哲学家进餐。",
    "管程把共享数据及其操作封装在一起，由编译器保证互斥。",
    "",
    "三、死锁要点",
    ...DEADLOCK.map((p) => p),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "期中复习提纲.txt"), lines, "utf8");
}

/* ---------- 3. DOCX ---------- */

async function genDocx() {
  const children = [
    new Paragraph({ text: "第 4 讲 处理机调度", heading: HeadingLevel.HEADING_1 }),
    new Paragraph("本讲义配套课程视频第 9-11 节，覆盖调度体系、算法与指标。"),
    new Paragraph({ text: "4.1 三级调度", heading: HeadingLevel.HEADING_2 }),
    ...SCHED.intro.map((p) => new Paragraph(p)),
    new Paragraph({ text: "4.2 经典调度算法", heading: HeadingLevel.HEADING_2 }),
    ...SCHED.algorithms.map((p) => new Paragraph(p)),
    new Paragraph({ text: "4.3 性能指标", heading: HeadingLevel.HEADING_2 }),
    ...SCHED.metrics.map((p) => new Paragraph(p)),
    new Paragraph({ text: "第 5 讲 死锁", heading: HeadingLevel.HEADING_1 }),
    ...DEADLOCK.map((p) => new Paragraph(p)),
    new Paragraph({ text: "附：常用公式", heading: HeadingLevel.HEADING_2 }),
    ...FORMULAS.map((f) => new Paragraph(f)),
  ];
  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, "第4-5讲-调度与死锁.docx"), buf);
}

/* ---------- 4. PPTX ---------- */

async function genPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  const slides = [
    ["第 5 讲 死锁", ["本讲目标：理解死锁成因、掌握处理策略", "重点：四个必要条件、银行家算法"]],
    ["什么是死锁", [DEADLOCK[0]]],
    ["死锁的四个必要条件", ["互斥条件：资源一次只能被一个进程使用", "请求和保持：进程保持已有资源又申请新资源", "不可剥夺：已分配资源不能被强行夺走", "循环等待：存在进程-资源的环形等待链"]],
    ["条件之间的关系", ["四个条件缺一不可，循环等待是前三个条件的必然结果", "破坏任意一个即可预防死锁"]],
    ["处理死锁的策略", [DEADLOCK[2]]],
    ["预防死锁", [DEADLOCK[3]]],
    ["避免死锁：安全状态", ["安全序列：系统能按该顺序为每个进程分配资源直到完成", "安全状态一定无死锁，不安全状态可能死锁"]],
    ["银行家算法", [DEADLOCK[4], "数据结构：Available / Max / Allocation / Need 矩阵"]],
    ["银行家算法示例", ["进程 P1 申请资源时先试探分配，再求安全序列", "找到安全序列则真正分配，否则 P1 等待"]],
    ["死锁检测", [DEADLOCK[5]]],
    ["死锁解除", [DEADLOCK[6]]],
    ["本讲小结", ["四个必要条件与四种策略要能一一对应", "银行家算法需手工演算：期末必考大题"]],
  ];
  for (const [title, bullets] of slides) {
    const s = pptx.addSlide();
    s.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 26, bold: true, color: "22242D" });
    s.addText(bullets.map((t) => ({ text: t, options: { bullet: true } })), {
      x: 0.7, y: 1.3, w: 8.6, h: 3.6, fontSize: 15, color: "5D6170", lineSpacing: 26,
    });
  }
  await pptx.writeFile({ fileName: path.join(OUT, "第5讲-死锁.pptx") });
}

/* ---------- 5. PDF（文字层，含公式文本） ---------- */

async function genPdf() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = fs.readFileSync("C:\\Windows\\Fonts\\simhei.ttf");
  const font = await doc.embedFont(fontBytes, { subset: true });
  const size = 11;
  const W = 595, H = 842, M = 56, LINE = 22, CHARS = 40;

  const wrap = (text) => {
    const out = [];
    for (let i = 0; i < text.length; i += CHARS) out.push(text.slice(i, i + CHARS));
    return out;
  };

  const pagesContent = [
    { title: "Chapter 3 处理机调度", paras: SCHED.intro },
    { title: "3.1 调度算法（一）", paras: SCHED.algorithms.slice(0, 3) },
    { title: "3.2 调度算法（二）", paras: SCHED.algorithms.slice(3, 5) },
    { title: "3.3 调度算法（三）", paras: SCHED.algorithms.slice(5) },
    { title: "3.4 性能指标", paras: SCHED.metrics },
    { title: "3.5 公式速查", paras: FORMULAS },
    { title: "Chapter 4 死锁（一）", paras: DEADLOCK.slice(0, 3) },
    { title: "Chapter 4 死锁（二）", paras: DEADLOCK.slice(3, 5) },
    { title: "Chapter 4 死锁（三）", paras: DEADLOCK.slice(5) },
    { title: "复习要求", paras: [
      "1. 手工模拟 FCFS、SJF、RR、HRRN 调度过程并计算平均周转时间与带权周转时间。",
      "2. 银行家算法大题：写出 Need 矩阵、求安全序列、判断分配是否可行。",
      "3. 简答题：说明多级反馈队列调度为何兼顾交互与吞吐。",
    ] },
  ];

  for (const pc of pagesContent) {
    const page = doc.addPage([W, H]);
    let y = H - M;
    for (const line of wrap(pc.title)) {
      page.drawText(line, { x: M, y, size: 16, font, color: rgb(0.13, 0.14, 0.18) });
      y -= 30;
    }
    y -= 8;
    for (const para of pc.paras) {
      for (const line of wrap(para)) {
        page.drawText(line, { x: M, y, size, font, color: rgb(0.2, 0.22, 0.28) });
        y -= LINE;
      }
      y -= 10;
    }
  }
  const bytes = await doc.save();
  fs.writeFileSync(path.join(OUT, "Chapter3-4-调度与死锁.pdf"), bytes);
}

/* ---------- 6. 扫描件 PDF（无文字层，图片页） ---------- */

async function genScanPdf() {
  const pngs = ["scan-page-1.png", "scan-page-2.png"]
    .map((f) => path.join(OUT, "assets", f))
    .filter((f) => fs.existsSync(f));
  if (pngs.length === 0) throw new Error("缺少扫描页 PNG，请先运行 scripts/gen-scan-pages.ps1");
  const doc = await PDFDocument.create();
  for (const png of pngs) {
    const img = await doc.embedPng(fs.readFileSync(png));
    const page = doc.addPage([595, 842]);
    page.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
  }
  fs.writeFileSync(path.join(OUT, "扫描件-文件管理笔记.pdf"), await doc.save());
}

/* ---------- 执行 ---------- */

await genMd();
await genTxt();
await genDocx();
await genPptx();
await genPdf();
await genScanPdf();
console.log("test files generated:", fs.readdirSync(OUT).filter((f) => f !== "assets").join(", "));
