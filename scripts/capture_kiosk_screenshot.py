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

TODAY_STR = time.strftime("%Y-%m-%d")

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
        "name": "Siti Nur Aini",
        "nickname": "Aini",
        "class": "10-IPA-2",
        "gender": "P",
        "parentName": "Ibu Ratna Dewi",
        "parentPhone": "0813-5566-7788",
        "enrolledAt": "10 Okt 2026, 08:35 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:44 WIB"
    },
    {
        "id": "NIS-2024003",
        "name": "Muhammad Rizky Pratama",
        "nickname": "Rizky",
        "class": "11-IPS-1",
        "gender": "L",
        "parentName": "Bpk. Joko Susanto",
        "parentPhone": "0812-9988-7766",
        "enrolledAt": "10 Okt 2026, 08:40 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:48 WIB"
    },
    {
        "id": "NIS-2024004",
        "name": "Dewi Sartika Putri",
        "nickname": "Dewi",
        "class": "11-IPA-1",
        "gender": "P",
        "parentName": "Ibu Sri Wahyuni",
        "parentPhone": "0813-4433-2211",
        "enrolledAt": "10 Okt 2026, 08:45 WIB",
        "consentCertified": True,
        "faceDescriptors": [],
        "lastSeen": "Hari ini, 06:50 WIB"
    }
]

DEMO_ATTENDANCE = [
    {
        "id": "ATT-00109",
        "studentId": "NIS-2024229",
        "studentName": "eldf",
        "class": "10-IPA-1",
        "timestamp": "06:45:12",
        "dateString": TODAY_STR,
        "status": "Tepat Waktu",
        "method": "Walk-Through Face Recognition",
        "confidence": "99.4%",
        "speed": "1.3 m/s",
        "attendanceType": "DATANG"
    },
    {
        "id": "ATT-00108",
        "studentId": "NIS-2024001",
        "studentName": "Ahmad Fauzi Prasetyo",
        "class": "10-IPA-1",
        "timestamp": "06:42:08",
        "dateString": TODAY_STR,
        "status": "Tepat Waktu",
        "method": "Walk-Through Face Recognition",
        "confidence": "98.7%",
        "speed": "1.4 m/s",
        "attendanceType": "DATANG"
    },
    {
        "id": "ATT-00107",
        "studentId": "NIS-2024002",
        "studentName": "Siti Nur Aini",
        "class": "10-IPA-2",
        "timestamp": "06:44:31",
        "dateString": TODAY_STR,
        "status": "Tepat Waktu",
        "method": "Walk-Through Face Recognition",
        "confidence": "99.1%",
        "speed": "1.2 m/s",
        "attendanceType": "DATANG"
    },
    {
        "id": "ATT-00106",
        "studentId": "NIS-2024003",
        "studentName": "Muhammad Rizky Pratama",
        "class": "11-IPS-1",
        "timestamp": "06:48:19",
        "dateString": TODAY_STR,
        "status": "Tepat Waktu",
        "method": "Walk-Through Face Recognition",
        "confidence": "97.9%",
        "speed": "1.5 m/s",
        "attendanceType": "DATANG"
    }
]

def run():
    print("Launching Chromium...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            color_scheme="dark",
            permissions=["camera"]
        )
        page = context.new_page()

        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")

        # Inject demo data and open Kiosk sidebar
        import json
        page.evaluate(f"""() => {{
            localStorage.setItem('biopass_students', '{json.dumps(DEMO_STUDENTS)}');
            localStorage.setItem('biopass_attendance', '{json.dumps(DEMO_ATTENDANCE)}');
            localStorage.setItem('biopass_admin_unlocked', 'true');
        }}""")
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Open Kiosk panel via button if not open
        kiosk_btn = page.locator('button[title*="Panel Kiosk"]')
        if kiosk_btn.count() > 0:
            kiosk_btn.first.click(force=True)
            time.sleep(1)

        # Inject realistic gate perspective and student verification overlay
        page.evaluate("""() => {
            const video = document.querySelector('video');
            const parent = video ? video.parentElement : null;
            if (parent && !document.getElementById('mock-camera-overlay')) {
                if (video) video.style.opacity = '0';
                
                const overlay = document.createElement('div');
                overlay.id = 'mock-camera-overlay';
                overlay.style.position = 'absolute';
                overlay.style.inset = '0';
                overlay.style.zIndex = '5';
                overlay.style.backgroundColor = '#070b15';
                overlay.style.overflow = 'hidden';
                
                overlay.innerHTML = `
                    <div style="position: absolute; inset: 0; background: radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), linear-gradient(180deg, #0a0f1d 0%, #070b14 100%);"></div>
                    
                    <!-- Perspective Architectural Corridor Turnstile -->
                    <svg style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.12;" preserveAspectRatio="none" viewBox="0 0 1000 700">
                        <line x1="500" y1="200" x2="50" y2="700" stroke="#ffffff" stroke-width="1.5" />
                        <line x1="500" y1="200" x2="250" y2="700" stroke="#ffffff" stroke-width="1.5" />
                        <line x1="500" y1="200" x2="750" y2="700" stroke="#ffffff" stroke-width="1.5" />
                        <line x1="500" y1="200" x2="950" y2="700" stroke="#ffffff" stroke-width="1.5" />
                        <line x1="200" y1="450" x2="800" y2="450" stroke="#ffffff" stroke-dasharray="4 4" stroke-width="1" />
                        <line x1="120" y1="580" x2="880" y2="580" stroke="#ffffff" stroke-dasharray="4 4" stroke-width="1" />
                    </svg>
                    
                    <!-- Glass Turnstile Barrier Pillars -->
                    <div style="position: absolute; left: 16%; bottom: 0; width: 5%; height: 52%; border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 8px 8px 0 0; background: rgba(16, 185, 129, 0.04);">
                        <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 9999px; background: #10b981; box-shadow: 0 0 10px #10b981;"></div>
                    </div>
                    <div style="position: absolute; right: 16%; bottom: 0; width: 5%; height: 52%; border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 8px 8px 0 0; background: rgba(16, 185, 129, 0.04);">
                        <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 9999px; background: #10b981; box-shadow: 0 0 10px #10b981;"></div>
                    </div>
                    
                    <!-- Student Approaching with Clean Biometric Viewfinder -->
                    <div style="position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
                        <!-- Floating Verification Pill -->
                        <div style="margin-bottom: 12px; padding: 7px 16px; border-radius: 12px; background: rgba(11, 15, 25, 0.94); border: 1px solid rgba(16, 185, 129, 0.45); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); display: flex; align-items: center; gap: 8px;">
                            <span style="color: #10b981; font-weight: bold; font-size: 14px;">✓</span>
                            <span style="color: #ffffff; font-weight: 600; font-size: 13px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">Ahmad Fauzi Prasetyo</span>
                            <span style="color: rgba(255, 255, 255, 0.2);">•</span>
                            <span style="color: #94a3b8; font-size: 12px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">Kelas 10-IPA-1</span>
                        </div>
                        
                        <!-- Precision Reticle Box -->
                        <div style="width: 140px; height: 175px; position: relative;">
                            <div style="position: absolute; top: 0; left: 0; width: 28px; height: 28px; border-top: 2.5px solid #10b981; border-left: 2.5px solid #10b981; border-top-left-radius: 10px;"></div>
                            <div style="position: absolute; top: 0; right: 0; width: 28px; height: 28px; border-top: 2.5px solid #10b981; border-right: 2.5px solid #10b981; border-top-right-radius: 10px;"></div>
                            <div style="position: absolute; bottom: 0; left: 0; width: 28px; height: 28px; border-bottom: 2.5px solid #10b981; border-left: 2.5px solid #10b981; border-bottom-left-radius: 10px;"></div>
                            <div style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-bottom: 2.5px solid #10b981; border-right: 2.5px solid #10b981; border-bottom-right-radius: 10px;"></div>
                            <div style="position: absolute; inset: 0; border-radius: 10px; background: rgba(16, 185, 129, 0.04);"></div>
                        </div>
                    </div>
                `;
                parent.appendChild(overlay);
            }
        };""")
        time.sleep(1)

        dest_png = OUTPUT_DIR / "11_Fullscreen_Split_Kiosk_Mode.png"
        page.screenshot(path=str(dest_png), full_page=False)
        print(f"Captured: {dest_png}")

        if ARTIFACT_DIR.exists():
            art_dest = ARTIFACT_DIR / "11_Fullscreen_Split_Kiosk_Mode.png"
            shutil.copy2(dest_png, art_dest)
            print(f"Copied to artifact: {art_dest}")

        browser.close()

if __name__ == "__main__":
    run()
