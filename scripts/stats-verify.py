"""统计页验证：确认无 ECharts 报错 + 截图"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, channel="chrome")
    page = b.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto("http://localhost:3000/stats")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3500)
    echarts_errs = [e for e in errors if "ECharts" in e]
    print("ECharts 报错:", echarts_errs if echarts_errs else "无")
    canvas_like = page.locator("canvas").count()
    print("canvas 数量:", canvas_like)
    page.screenshot(path="test/assets/stats-check.png")
    print("截图: test/assets/stats-check.png")
    b.close()
