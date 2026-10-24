# 生成"扫描件"页面 PNG（模拟拍照/扫描的课堂笔记，无文字层）
Add-Type -AssemblyName System.Drawing

$outDir = "F:\MyProject\AI_learner\test\assets"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$pages = @(
  @(
    '第 7 章 文件管理（课堂笔记 · 扫描页 1）',
    '文件系统基础概念',
    '文件是具有文件名的一组相关信息的集合。操作系统通过文件系统对文件进行管理，',
    '主要功能包括：文件存储空间管理、目录管理、文件读写管理、文件共享与保护。',
    '文件的逻辑结构分为有结构文件（记录式）和无结构文件（流式）。物理结构分为',
    '连续分配、链接分配和索引分配三种方式。',
    '连续分配：文件占用连续磁盘块，支持随机访问，但存在外部碎片，文件扩展困难。',
    '链接分配：每个盘块含指向下一块的指针，无外部碎片，但只能顺序访问，可靠性差。',
    '索引分配：建立索引表记录所有盘块号，支持随机访问，索引表占用额外空间。'
  ),
  @(
    '第 7 章 文件管理（课堂笔记 · 扫描页 2）',
    '目录结构与文件共享',
    '文件目录是一种数据结构，用于标识系统中的文件及其物理位置，实现按名存取。',
    '单级目录结构简单但查找慢且不允许重名；两级目录分为主文件目录和用户文件目录；',
    '树形目录层次清晰，便于分类管理，是目前主流的目录结构形式。',
    'FCB（文件控制块）存放文件名、物理位置、逻辑结构、物理结构、存取权限等信息。',
    'UNIX 系统采用索引结点 inode：FCB 中除文件名外的信息放入 inode，目录项仅存',
    '文件名与 inode 号，显著减少目录占用的磁盘空间，加快检索速度。'
  )
)

$fontTitle = New-Object System.Drawing.Font("Microsoft YaHei", 34, [System.Drawing.FontStyle]::Bold)
$fontBody  = New-Object System.Drawing.Font("Microsoft YaHei", 24, [System.Drawing.FontStyle]::Regular)

$i = 0
foreach ($page in $pages) {
  $i++
  $bmp = New-Object System.Drawing.Bitmap(1240, 1754)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(248, 246, 240))
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $y = 120
  $line = 0
  foreach ($text in $page) {
    if ($line -eq 0) {
      $g.DrawString($text, $fontTitle, [System.Drawing.Brushes]::DarkSlateGray, 80, $y)
      $y += 90
    } else {
      $g.DrawString($text, $fontBody, [System.Drawing.Brushes]::Black, 80, $y)
      $y += 62
    }
    $line++
  }
  $bmp.Save("$outDir\scan-page-$i.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output "scan pages generated: $i"
