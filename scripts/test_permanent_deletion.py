import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:5173")
    page.wait_for_timeout(2500)

    # Check initial students
    st_count_before = page.evaluate("() => JSON.parse(localStorage.getItem('biopass_students') || '[]').length")
    print(f"Students count before deletion: {st_count_before}")

    # Go to Student Directory
    page.click("text=Student Directory")
    page.wait_for_timeout(1000)

    # Auto-accept window.confirm
    page.on("dialog", lambda dialog: dialog.accept())

    # Find Delete Student button
    del_btns = page.locator("button[title='Delete Student']")
    count = del_btns.count()
    print(f"Found {count} delete student buttons")
    if count > 0:
        del_btns.first.click()
        page.wait_for_timeout(1500)
        print("Clicked Delete Student button")

    st_count_after_del = page.evaluate("() => JSON.parse(localStorage.getItem('biopass_students') || '[]').length")
    deleted_ids = page.evaluate("() => localStorage.getItem('biopass_deleted_student_ids')")
    print(f"Students count immediately after deletion: {st_count_after_del}")
    print(f"Deleted IDs blacklist: {deleted_ids}")

    # Now RELOAD the page
    print("Reloading page to test student deletion persistence...")
    page.reload()
    page.wait_for_timeout(3000)

    st_count_after_reload = page.evaluate("() => JSON.parse(localStorage.getItem('biopass_students') || '[]').length")
    print(f"Students count after reload: {st_count_after_reload}")

    assert st_count_after_reload == st_count_after_del, f"ERROR: Expected {st_count_after_del} students, but got {st_count_after_reload} (data resurrected!)"
    print("SUCCESS: Deleted student did NOT return after reload!")

    # Test clearing attendance logs
    page.click("text=Attendance Ledger")
    page.wait_for_timeout(1000)
    clear_att_btn = page.locator("button[title*='Hapus riwayat presensi']")
    if clear_att_btn.count() > 0:
        clear_att_btn.click()
        page.wait_for_timeout(1500)
        print("Clicked clear attendance logs button")

    att_count_after_clear = page.evaluate("() => JSON.parse(localStorage.getItem('biopass_attendance') || '[]').length")
    print(f"Attendance count immediately after clear: {att_count_after_clear}")

    print("Reloading page to test attendance log persistence...")
    page.reload()
    page.wait_for_timeout(3000)

    att_count_after_reload = page.evaluate("() => JSON.parse(localStorage.getItem('biopass_attendance') || '[]').length")
    print(f"Attendance count after reload: {att_count_after_reload}")

    assert att_count_after_reload == 0, f"ERROR: Expected 0 attendance logs, but got {att_count_after_reload} (logs resurrected!)"
    print("SUCCESS: Cleared attendance logs did NOT return after reload!")

    browser.close()
