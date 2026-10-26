import sys
import time
from pathlib import Path
import shutil

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent.parent.resolve()
OUTPUT_DIR = BASE_DIR / "presentation_screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)
ARTIFACT_DIR = Path(r"C:\Users\Salman\.gemini\antigravity\brain\141a1ad2-e974-4282-8e59-2a64bb034bb8")

def capture_real_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.0
        )
        page = context.new_page()

        print("Navigating to http://localhost:3000 ...")
        page.goto("http://localhost:3000")
        page.wait_for_timeout(3000)

        # 1. Live Gate with Split Kiosk
        print("Capturing 01_Real_Live_Gate_Kiosk.png ...")
        # Ensure kiosk split is visible
        try:
            split_btn = page.locator("button:has-text('Kiosk Info')")
            if split_btn.count() > 0:
                split_btn.click()
                page.wait_for_timeout(1000)
        except Exception as e:
            print("Kiosk toggle note:", e)

        img1_path = OUTPUT_DIR / "01_Real_Live_Gate_Kiosk.png"
        page.screenshot(path=str(img1_path), full_page=False)
        shutil.copy(img1_path, ARTIFACT_DIR / "01_Real_Live_Gate_Kiosk.png")

        # 2. Student Directory
        print("Capturing 02_Real_Student_Directory_Clean.png ...", flush=True)
        page.locator("button:has-text('Student Directory')").click()
        page.wait_for_timeout(2000)
        img2_path = OUTPUT_DIR / "02_Real_Student_Directory_Clean.png"
        page.screenshot(path=str(img2_path), full_page=False)
        shutil.copy(img2_path, ARTIFACT_DIR / "02_Real_Student_Directory_Clean.png")

        # 3. Attendance Ledger
        print("Capturing 03_Real_Attendance_Ledger_Clean.png ...", flush=True)
        page.locator("button:has-text('Attendance Ledger')").click()
        page.wait_for_timeout(2000)
        img3_path = OUTPUT_DIR / "03_Real_Attendance_Ledger_Clean.png"
        page.screenshot(path=str(img3_path), full_page=False)
        shutil.copy(img3_path, ARTIFACT_DIR / "03_Real_Attendance_Ledger_Clean.png")

        # 4. Admin Panel - Staff Management Subtab
        print("Capturing 04_Real_Admin_Staff_Management.png ...", flush=True)
        page.locator("button:has-text('Panel Admin')").click()
        page.wait_for_timeout(2000)
        # Click "Hak Akses & Pengguna (RBAC)" subtab
        page.locator("button:has-text('Hak Akses & Pengguna (RBAC)')").click()
        page.wait_for_timeout(1500)
        img4_path = OUTPUT_DIR / "04_Real_Admin_Staff_Management.png"
        page.screenshot(path=str(img4_path), full_page=False)
        shutil.copy(img4_path, ARTIFACT_DIR / "04_Real_Admin_Staff_Management.png")

        # 5. Open Add Staff Modal
        print("Capturing 05_Real_Admin_Staff_Modal.png ...", flush=True)
        page.locator("button:has-text('+ Tambah Akun Staf')").click()
        page.wait_for_timeout(1000)
        img5_path = OUTPUT_DIR / "05_Real_Admin_Staff_Modal.png"
        page.screenshot(path=str(img5_path), full_page=False)
        shutil.copy(img5_path, ARTIFACT_DIR / "05_Real_Admin_Staff_Modal.png")
        # Close modal
        page.locator("button:has-text('Batal')").click()
        page.wait_for_timeout(500)

        # 6. WhatsApp Hub
        print("Capturing 06_Real_WhatsApp_Hub.png ...", flush=True)
        page.locator("button:has-text('WhatsApp Alerts')").click()
        page.wait_for_timeout(2000)
        img6_path = OUTPUT_DIR / "06_Real_WhatsApp_Hub.png"
        page.screenshot(path=str(img6_path), full_page=False)
        shutil.copy(img6_path, ARTIFACT_DIR / "06_Real_WhatsApp_Hub.png")

        browser.close()
        print("All screenshots successfully captured!", flush=True)

if __name__ == "__main__":
    capture_real_app()
