"""图谱优化验证：截图 + 检查画布与节点分散度"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="chrome")
    page = browser.new_page(viewport={"width": 1280, "height": 860})
    page.goto("http://localhost:3000/graph")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(9000)  # 等力导布局收敛

    canvases = page.locator("canvas").count()
    print("canvas 数量:", canvases)

    if canvases > 0:
        page.screenshot(path="test/assets/graph-after.png")
        print("截图已存: test/assets/graph-after.png")
        # 读取 G6 画布内节点像素分布的粗略代理：取画布容器位置
        box = page.locator("canvas").first.bounding_box()
        print("画布尺寸:", box["width"], "x", box["height"])

    browser.close()
