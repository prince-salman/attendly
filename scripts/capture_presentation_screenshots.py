import json
import os
import shutil
import sys
import time
from pathlib import Path

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent.parent.resolve()
OUTPUT_DIR = BASE_DIR / "presentation_screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)

ARTIFACT_DIR = Path(r"C:\Users\Salman\.gemini\antigravity\brain\141a1ad2-e974-4282-8e59-2a64bb034bb8")

TODAY_STR = time.strftime("%Y-%m-%d")

# Rich demo data for presentation
DEMO_STUDENTS = [
    {
        "id": "NIS-2024229",
        "name": "eldf",
        "nickname": "eldf",
        "class": "10-IPA-1",
        "gender": "L",
        "parentName": "Bpk. Herman Wijaya",
        "parentPhone": "0812-3456-7890",
        "enrolledAt": "14 Okt 2026, 12:52 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:45 WIB"
    },
    {
        "id": "NIS-2024001",
        "name": "Ahmad Fauzi Prasetyo",
        "nickname": "Fauzi",
        "class": "10-IPA-1",
        "gender": "L",
        "parentName": "Bpk. Rahmat Santoso",
        "parentPhone": "0813-1122-3344",
        "enrolledAt": "10 Okt 2026, 08:30 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:42 WIB"
    },
    {
        "id": "NIS-2024002",
        "name": "Siti Rahma Nurfadilah",
        "nickname": "Rahma",
        "class": "10-IPA-1",
        "gender": "P",
        "parentName": "Ibu Maryam Zulaikha",
        "parentPhone": "0812-9988-7766",
        "enrolledAt": "10 Okt 2026, 08:35 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:50 WIB"
    },
    {
        "id": "NIS-2024003",
        "name": "Budi Pratama Nugraha",
        "nickname": "Budi",
        "class": "10-IPA-2",
        "gender": "L",
        "parentName": "Bpk. Joko Susilo",
        "parentPhone": "0821-5544-3322",
        "enrolledAt": "11 Okt 2026, 09:15 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:55 WIB"
    },
    {
        "id": "NIS-2024004",
        "name": "Dewi Anggraini Maharani",
        "nickname": "Dewi",
        "class": "10-IPA-2",
        "gender": "P",
        "parentName": "Ibu Sri Wahyuni",
        "parentPhone": "0815-4433-2211",
        "enrolledAt": "11 Okt 2026, 09:20 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 07:05 WIB"
    },
    {
        "id": "NIS-2024005",
        "name": "Rizky Ramadhan Hakim",
        "nickname": "Rizky",
        "class": "11-IPA-1",
        "gender": "L",
        "parentName": "Bpk. Faisal Akbar",
        "parentPhone": "0817-6677-8899",
        "enrolledAt": "12 Okt 2026, 10:00 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:38 WIB"
    },
    {
        "id": "NIS-2024006",
        "name": "Nabila Putri Salsabila",
        "nickname": "Nabila",
        "class": "11-IPA-1",
        "gender": "P",
        "parentName": "Ibu Dewi Lestari",
        "parentPhone": "0818-7788-9900",
        "enrolledAt": "12 Okt 2026, 10:05 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:49 WIB"
    },
    {
        "id": "NIS-2024007",
        "name": "Kevin Sanjaya Pratama",
        "nickname": "Kevin",
        "class": "11-IPS-1",
        "gender": "L",
        "parentName": "Bpk. Anton Subagyo",
        "parentPhone": "0819-8899-0011",
        "enrolledAt": "12 Okt 2026, 10:15 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 07:12 WIB"
    }
]

DEMO_ATTENDANCE_LOGS = [
    {
        "id": "LOG-101",
        "studentId": "NIS-2024005",
        "studentName": "Rizky Ramadhan Hakim",
        "class": "11-IPA-1",
        "date": TODAY_STR,
        "timestamp": "06:38:15 WIB",
        "status": "Hadir Tepat Waktu",
        "scanType": "DATANG",
        "confidence": "98.7%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-102",
        "studentId": "NIS-2024001",
        "studentName": "Ahmad Fauzi Prasetyo",
        "class": "10-IPA-1",
        "date": TODAY_STR,
        "timestamp": "06:42:30 WIB",
        "status": "Hadir Tepat Waktu",
        "scanType": "DATANG",
        "confidence": "99.2%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-103",
        "studentId": "NIS-2024229",
        "studentName": "eldf",
        "class": "10-IPA-1",
        "date": TODAY_STR,
        "timestamp": "06:45:10 WIB",
        "status": "Hadir Tepat Waktu",
        "scanType": "DATANG",
        "confidence": "99.4%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-104",
        "studentId": "NIS-2024006",
        "studentName": "Nabila Putri Salsabila",
        "class": "11-IPA-1",
        "date": TODAY_STR,
        "timestamp": "06:49:05 WIB",
        "status": "Hadir Tepat Waktu",
        "scanType": "DATANG",
        "confidence": "97.8%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-105",
        "studentId": "NIS-2024002",
        "studentName": "Siti Rahma Nurfadilah",
        "class": "10-IPA-1",
        "date": TODAY_STR,
        "timestamp": "06:50:40 WIB",
        "status": "Hadir Tepat Waktu",
        "scanType": "DATANG",
        "confidence": "98.9%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-106",
        "studentId": "NIS-2024003",
        "studentName": "Budi Pratama Nugraha",
        "class": "10-IPA-2",
        "date": TODAY_STR,
        "timestamp": "06:55:20 WIB",
        "status": "Hadir Tepat Waktu",
        "scanType": "DATANG",
        "confidence": "98.1%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-107",
        "studentId": "NIS-2024004",
        "studentName": "Dewi Anggraini Maharani",
        "class": "10-IPA-2",
        "date": TODAY_STR,
        "timestamp": "07:05:12 WIB",
        "status": "Terlambat",
        "scanType": "DATANG",
        "confidence": "98.5%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    },
    {
        "id": "LOG-108",
        "studentId": "NIS-2024007",
        "studentName": "Kevin Sanjaya Pratama",
        "class": "11-IPS-1",
        "date": TODAY_STR,
        "timestamp": "07:12:45 WIB",
        "status": "Terlambat",
        "scanType": "DATANG",
        "confidence": "97.4%",
        "device": "Gate Corridor 01 (Utama)",
        "whatsappSent": True
    }
]

DEMO_WHATSAPP_LOGS = [
    {
        "id": "WA-881",
        "studentId": "NIS-2024007",
        "studentName": "Kevin Sanjaya Pratama",
        "parentPhone": "0819-8899-0011",
        "content": "[Attendly Gate Alert] Yth. Bpk/Ibu wali murid Kevin Sanjaya Pratama, siswa terdeteksi masuk gerbang sekolah pada 07:12:45 WIB dengan status: TERLAMBAT (+12 menit). Mohon bimbingan bersama.",
        "timestamp": "Hari ini, 07:12 WIB",
        "status": "DELIVERED",
        "messageType": "Alert Keterlambatan",
        "attendanceType": "DATANG"
    },
    {
        "id": "WA-882",
        "studentId": "NIS-2024004",
        "studentName": "Dewi Anggraini Maharani",
        "parentPhone": "0815-4433-2211",
        "content": "[Attendly Gate Alert] Yth. Bpk/Ibu wali murid Dewi Anggraini Maharani, siswi terdeteksi masuk gerbang pada 07:05:12 WIB dengan status: TERLAMBAT (+5 menit).",
        "timestamp": "Hari ini, 07:05 WIB",
        "status": "DELIVERED",
        "messageType": "Alert Keterlambatan",
        "attendanceType": "DATANG"
    },
    {
        "id": "WA-883",
        "studentId": "NIS-2024229",
        "studentName": "eldf",
        "parentPhone": "0812-3456-7890",
        "content": "[Attendly Gate] Yth. Bpk. Herman Wijaya, ananda eldf telah sampai di sekolah dengan selamat pada 06:45:10 WIB (Hadir Tepat Waktu). Selamat beraktivitas!",
        "timestamp": "Hari ini, 06:45 WIB",
        "status": "READ",
        "messageType": "Konfirmasi Kehadiran",
        "attendanceType": "DATANG"
    },
    {
        "id": "WA-884",
        "studentId": "NIS-2024001",
        "studentName": "Ahmad Fauzi Prasetyo",
        "parentPhone": "0813-1122-3344",
        "content": "[Attendly Gate] Yth. Bpk. Rahmat Santoso, ananda Ahmad Fauzi Prasetyo telah terverifikasi di gerbang utama pada 06:42:30 WIB (Hadir Tepat Waktu).",
        "timestamp": "Hari ini, 06:42 WIB",
        "status": "READ",
        "messageType": "Konfirmasi Kehadiran",
        "attendanceType": "DATANG"
    }
]

def main():
    print("🚀 Starting Presentation Screenshots Capture...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--window-size=1920,1080"
            ]
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.25, # High-DPI crisp capture for presentation slides
            permissions=["camera"]
        )
        page = context.new_page()

        # Seed rich data into localStorage
        seed_script = f"""
            localStorage.setItem('biopass_students', JSON.stringify({json.dumps(DEMO_STUDENTS)}));
            localStorage.setItem('biopass_attendance', JSON.stringify({json.dumps(DEMO_ATTENDANCE_LOGS)}));
            localStorage.setItem('biopass_whatsapp', JSON.stringify({json.dumps(DEMO_WHATSAPP_LOGS)}));
            localStorage.setItem('attendly_theme', 'dark');
            localStorage.setItem('attendly_gate_mode', 'DATANG');
        """
        page.add_init_script(seed_script)

        # 1. Screen 1: Live Gate Scanner (Datang Mode)
        print("📸 Capturing Screen 1: Live Gate Scanner (Datang Mode)...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        page.wait_for_timeout(2500)
        
        # Trigger verified face box simulation on canvas
        page.evaluate("""
            const canvas = document.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const w = canvas.width;
                const h = canvas.height;
                // Draw high-tech bounding box
                const bx = w * 0.38, by = h * 0.22, bw = w * 0.24, bh = h * 0.48;
                ctx.strokeStyle = '#10B981';
                ctx.lineWidth = 3;
                ctx.strokeRect(bx, by, bw, bh);
                ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                ctx.fillRect(bx, by, bw, bh);
            }
        """)
        
        path_1 = OUTPUT_DIR / "01_Live_Gate_Scanner_Datang.png"
        page.screenshot(path=str(path_1), full_page=False)

        # 2. Screen 2: Live Gate Scanner (Pulang Mode)
        print("📸 Capturing Screen 2: Live Gate Scanner (Pulang Mode)...")
        # Click Absen Pulang button
        pulang_btn = page.locator('button:has-text("Absen Pulang")')
        if pulang_btn.count() > 0:
            pulang_btn.first.click()
            page.wait_for_timeout(1000)
        path_2 = OUTPUT_DIR / "02_Live_Gate_Scanner_Pulang.png"
        page.screenshot(path=str(path_2), full_page=False)

        # Switch back to Datang mode
        datang_btn = page.locator('button:has-text("Absen Datang")')
        if datang_btn.count() > 0:
            datang_btn.first.click()
            page.wait_for_timeout(500)

        # 3. Screen 3: Student Directory & Biometric Face Enrollment Station
        print("📸 Capturing Screen 3: Student Directory & Enrollment Station...")
        page.locator('button:has-text("Student Directory")').first.click()
        page.wait_for_timeout(2000)
        path_3 = OUTPUT_DIR / "03_Student_Directory_Enrollment.png"
        page.screenshot(path=str(path_3), full_page=False)

        # 4. Screen 4: Attendance Ledger
        print("📸 Capturing Screen 4: Attendance Ledger...")
        page.locator('button:has-text("Attendance Ledger")').first.click()
        page.wait_for_timeout(1500)
        path_4 = OUTPUT_DIR / "04_Attendance_Ledger.png"
        page.screenshot(path=str(path_4), full_page=False)

        # 5. Screen 5: Monthly Attendance PDF Modal
        print("📸 Capturing Screen 5: Monthly Attendance PDF Preview Modal...")
        pdf_btn = page.locator('button:has-text("Monthly Ledger")')
        if pdf_btn.count() > 0:
            pdf_btn.first.click()
            page.wait_for_timeout(2000)
            path_5 = OUTPUT_DIR / "05_Monthly_Attendance_Report_Modal.png"
            page.screenshot(path=str(path_5), full_page=False)
            
            # Close modal
            close_btn = page.locator('button:has-text("Tutup Preview"), button:has-text("Tutup")')
            if close_btn.count() > 0:
                close_btn.first.click()
            else:
                page.keyboard.press("Escape")
            page.wait_for_timeout(800)

        # 6. Screen 6: Parent WhatsApp Alerts Hub
        print("📸 Capturing Screen 6: Parent WhatsApp Alerts Hub...")
        page.locator('button:has-text("WhatsApp Alerts")').first.click()
        page.wait_for_timeout(1500)

        # Click Dispatch Test Notice to trigger real-time WhatsApp alert
        dispatch_btn = page.locator('button:has-text("Dispatch Test Notice")')
        if dispatch_btn.count() > 0:
            dispatch_btn.first.click()
            page.wait_for_timeout(1000)

        path_6 = OUTPUT_DIR / "06_Parent_WhatsApp_Alerts_Hub.png"
        page.screenshot(path=str(path_6), full_page=False)

        # 7. Screen 7: Live WhatsApp Floating Notification Pop-up on Live Gate
        print("📸 Capturing Screen 7: Real-Time WhatsApp Notification Popup on Live Gate...")
        page.locator('button:has-text("Live Gate")').first.click()
        page.wait_for_timeout(1200)
        path_7 = OUTPUT_DIR / "07_Live_Gate_With_Corridor_HUD.png"
        page.screenshot(path=str(path_7), full_page=False)

        # 8. Screen 8: Institutional Multi-Tenant Admin Panel (Revealed via Hotkey Ctrl+Shift+A)
        print("📸 Capturing Screen 8: Multi-Tenant Institutional Admin Panel...")
        page.keyboard.press("Control+Shift+A")
        page.wait_for_timeout(2000)
        path_8 = OUTPUT_DIR / "08_Institutional_Admin_Panel.png"
        page.screenshot(path=str(path_8), full_page=False)

        # Switch to Admin sub-tab "activation"
        print("📸 Capturing Screen 9: Admin Activation & License Management...")
        activation_tab = page.locator('button:has-text("Aktivasi Kode Terminal")')
        if activation_tab.count() > 0:
            activation_tab.first.click()
            page.wait_for_timeout(1200)
            path_9 = OUTPUT_DIR / "09_Admin_License_Activation_View.png"
            page.screenshot(path=str(path_9), full_page=False)

        # 10. Screen 10: Clean Light Mode (Executive / Investor Presentation Style)
        print("📸 Capturing Screen 10: Clean Light Mode Presentation View...")
        page.locator('button:has-text("Attendance Ledger")').first.click()
        page.wait_for_timeout(1000)
        # Toggle light mode
        theme_toggle = page.locator('button[title*="Light"], button[title*="Dark"]').first
        if theme_toggle.count() > 0:
            theme_toggle.click()
            page.wait_for_timeout(1000)
        path_10 = OUTPUT_DIR / "10_Attendance_Ledger_Light_Mode.png"
        page.screenshot(path=str(path_10), full_page=False)

        browser.close()
        print("✅ All screenshots captured successfully!")

    # Copy all generated screenshots to conversation artifact directory
    print(f"📦 Copying screenshots to artifacts directory: {ARTIFACT_DIR}")
    copied_files = []
    for img_path in sorted(OUTPUT_DIR.glob("*.png")):
        dest = ARTIFACT_DIR / img_path.name
        shutil.copy2(img_path, dest)
        copied_files.append(dest)
        print(f"  ✓ Copied: {img_path.name}")

    print(f"🎉 Complete! {len(copied_files)} presentation slides ready.")

if __name__ == "__main__":
    main()
