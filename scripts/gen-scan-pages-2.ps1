# 生成第二批"扫描件"页面 PNG（数据结构 · 手写风格公式页，用于 OCR 测试）
Add-Type -AssemblyName System.Drawing

$outDir = "F:\MyProject\AI_learner\test\assets"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$pages = @(
  @(
    '数据结构 · 第 9 章 排序（课堂板书 · 拍照 1）',
    '插入排序：将第 i 个元素插入前面已排序区间，平均比较 ~ i/2 次。',
    '时间复杂度：最好 O(n)，最坏 O(n^2)，稳定排序。',
    '希尔排序：按增量 d 分组做插入排序，d 逐步减半直至 1。',
    '快速排序：选基准 pivot，一趟划分使左边 <= pivot <= 右边。',
    '递推式：T(n) = 2T(n/2) + O(n)，解得平均 O(n log n)。',
    '最坏情况（已有序 + 首元素为基准）：退化为 O(n^2)。'
  ),
  @(
    '数据结构 · 第 9 章 排序（课堂板书 · 拍照 2）',
    '归并排序：递归二分至长度 1，再两两合并有序子序列。',
    '空间复杂度 O(n)，时间稳定 O(n log n)，是稳定排序。',
    '堆排序：建大顶堆 O(n)，取堆顶后下沉调整 O(log n)。',
    '基数排序：按位分配-收集，d 趟桶排序，时间 O(d(n+r))。',
    '结论：n 较小时用插入；n 大且求稳定用归并；内存紧张用堆排。'
  )
)

$fontTitle = New-Object System.Drawing.Font("Microsoft YaHei", 32, [System.Drawing.FontStyle]::Bold)
$fontBody  = New-Object System.Drawing.Font("Microsoft YaHei", 23, [System.Drawing.FontStyle]::Regular)

$i = 0
foreach ($page in $pages) {
  $i++
  $bmp = New-Object System.Drawing.Bitmap(1240, 1754)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(245, 247, 242))
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $y = 130
  $line = 0
  foreach ($text in $page) {
    if ($line -eq 0) {
      $g.DrawString($text, $fontTitle, [System.Drawing.Brushes]::DarkSlateGray, 70, $y)
      $y += 88
    } else {
      $g.DrawString($text, $fontBody, [System.Drawing.Brushes]::Black, 90, $y)
      $y += 60
    }
    $line++
  }
  $bmp.Save("$outDir\ds-scan-page-$i.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output "ds scan pages generated: $i"
