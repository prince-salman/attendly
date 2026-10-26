from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://localhost:3000')
    page.wait_for_timeout(2000)
    btn = page.locator('button[title*="Panel Kiosk"]')
    if btn.count() > 0:
        btn.first.click(force=True)
    page.wait_for_timeout(1000)
    aside = page.locator('aside')
    if aside.count() > 0:
        print("ASIDE TEXT:\n" + aside.first.inner_text()[:600])
    else:
        print("NO ASIDE FOUND")
    browser.close()
