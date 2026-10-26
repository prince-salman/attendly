import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(2000)
    attendance_str = page.evaluate("() => localStorage.getItem('biopass_attendance')")
    wa_str = page.evaluate("() => localStorage.getItem('biopass_whatsapp')")
    students_str = page.evaluate("() => localStorage.getItem('biopass_students')")

    att_list = json.loads(attendance_str) if attendance_str else []
    wa_list = json.loads(wa_str) if wa_str else []
    st_list = json.loads(students_str) if students_str else []

    print(f"ATTENDANCE COUNT: {len(att_list)}")
    names_att = [a.get('studentName') for a in att_list]
    print(f"ATTENDANCE NAMES: {names_att[:10]}")

    print(f"WA COUNT: {len(wa_list)}")
    names_wa = [w.get('studentName') for w in wa_list]
    print(f"WA NAMES: {names_wa[:10]}")

    print(f"STUDENTS COUNT: {len(st_list)}")
    print(f"STUDENT NAMES: {[s.get('name') for s in st_list]}")

    browser.close()
