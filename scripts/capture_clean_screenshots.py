import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Salman\.gemini\antigravity\brain\141a1ad2-e974-4282-8e59-2a64bb034bb8"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:5173")
    page.wait_for_timeout(2500)

    # 1. Gate View
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "01_Gate_Kiosk_Clean_Navy.png"), full_page=False)
    print("Captured 01_Gate_Kiosk_Clean_Navy.png")

    # 2. Attendance Ledger View
    page.click("text=Attendance Ledger")
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "02_Attendance_Ledger_MultiStudent.png"), full_page=False)
    print("Captured 02_Attendance_Ledger_MultiStudent.png")

    # 3. WhatsApp Hub View
    page.click("text=WhatsApp Alerts")
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "03_WhatsApp_Hub_MultiStudent.png"), full_page=False)
    print("Captured 03_WhatsApp_Hub_MultiStudent.png")

    # 4. Admin Panel View
    page.click("text=Panel Admin")
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "04_Admin_Panel_Institutional.png"), full_page=False)
    print("Captured 04_Admin_Panel_Institutional.png")

    # 5. Student Directory View
    page.click("text=Student Directory")
    page.wait_for_timeout(1500)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "05_Student_Directory_MultiStudent.png"), full_page=False)
    print("Captured 05_Student_Directory_MultiStudent.png")

    browser.close()
    print("All screenshots successfully captured!")
