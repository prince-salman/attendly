from playwright.sync_api import sync_playwright

console_errors = []
console_warnings = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Catch any console errors
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else console_warnings.append(msg.text) if msg.type == "warning" else None)
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    print("1. Testing Live Gate Kiosk...")
    page.goto("http://127.0.0.1:5173")
    page.wait_for_timeout(2500)

    print("2. Testing Student Directory...")
    page.click("text=Student Directory")
    page.wait_for_timeout(1500)

    print("3. Testing Attendance Ledger...")
    page.click("text=Attendance Ledger")
    page.wait_for_timeout(1500)

    print("4. Testing WhatsApp Alerts Hub...")
    page.click("text=WhatsApp Alerts")
    page.wait_for_timeout(1500)

    print("5. Testing Admin Panel...")
    page.click("text=Panel Admin")
    page.wait_for_timeout(1500)

    print("6. Testing Return to Live Gate...")
    page.click("text=Live Gate")
    page.wait_for_timeout(1500)

    browser.close()

print(f"\nAUDIT SUMMARY:")
print(f"Page Errors: {len(page_errors)}")
for pe in page_errors:
    print(" - PAGE ERROR:", pe)

print(f"Console Errors: {len(console_errors)}")
for ce in console_errors:
    print(" - CONSOLE ERROR:", ce)

print(f"Console Warnings: {len(console_warnings)}")

if len(page_errors) == 0 and len(console_errors) == 0:
    print("\n✅ PERFECT: 0 PAGE ERRORS, 0 CONSOLE ERRORS ACROSS ALL TABS!")
else:
    print("\n⚠️ Found issues to review.")
