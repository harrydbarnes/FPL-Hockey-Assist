import time
import re
from playwright.sync_api import sync_playwright, expect

def verify_changes(page):
    page.goto('http://localhost:8000/src/index.html')
    # Force remove modal
    page.evaluate("if(document.getElementById('load-team-modal')) document.getElementById('load-team-modal').remove()")

    # 1. Verify "Fantasy Pants" Icon
    icon = page.locator('#team-logo')
    expect(icon).to_be_visible()
    classes = icon.get_attribute('class')
    print(f"Icon classes: {classes}")
    if 'bg-indigo-600' not in classes:
        print("ERROR: Icon does not have bg-indigo-600 class")
    else:
        print("SUCCESS: Icon has bg-indigo-600 class")

    # 2. Verify Mobile Menu Animation
    page.set_viewport_size({"width": 375, "height": 667})

    # Open menu
    page.locator('#mobile-menu-btn').click()
    time.sleep(0.5)

    sidebar = page.locator('#sidebar')
    sidebar_classes = sidebar.get_attribute('class')
    print(f"Sidebar classes (open): {sidebar_classes}")
    if '-translate-x-full' in sidebar_classes:
         print("ERROR: Sidebar still has -translate-x-full when open")
    else:
         print("SUCCESS: Sidebar is open")

    # Close menu by clicking outside (on the main content)
    # The sidebar is 256px wide. Viewport 375.
    # Click at x=300.
    page.mouse.click(300, 300)
    time.sleep(0.5)

    sidebar_classes_closed = sidebar.get_attribute('class')
    print(f"Sidebar classes (closed): {sidebar_classes_closed}")
    if '-translate-x-full' not in sidebar_classes_closed:
         print("ERROR: Sidebar does not have -translate-x-full when closed")
    else:
         print("SUCCESS: Sidebar is closed")

    # 3. Verify Modal Animation
    # Reload page
    page.reload()

    # Check initial state (should be open if no team ID)
    modal = page.locator('#load-team-modal')
    expect(modal).to_be_visible()

    time.sleep(0.5)
    modal_classes_after = modal.get_attribute('class')
    print(f"Modal classes (after anim): {modal_classes_after}")

    if 'opacity-0' in modal_classes_after:
         print("ERROR: Modal still has opacity-0")
    else:
         print("SUCCESS: Modal is opaque")

    # Close modal
    page.locator('#close-modal-btn').click()
    time.sleep(0.5)

    modal_classes_closed = modal.get_attribute('class')
    print(f"Modal classes (closed): {modal_classes_closed}")
    if 'hidden' not in modal_classes_closed:
         print("ERROR: Modal not hidden after close")
    else:
         print("SUCCESS: Modal is hidden")

    # 4. Verify League Icons
    page.evaluate("localStorage.setItem('fpl_team_id', '12345')")
    page.goto('http://localhost:8000/src/leagues.html')

    try:
        page.wait_for_selector('table', timeout=5000)
        time.sleep(1)

        icons = page.locator('table tbody tr td div.rounded-full').all()
        count = 0
        for i, icon in enumerate(icons):
            cls = icon.get_attribute('class')
            if 'size-8' in cls:
                count += 1
                text = icon.text_content()
                if text and text.strip() != "":
                     print(f"ERROR: Icon {i} has text '{text}'")
                else:
                     pass
        if count > 0:
            print(f"SUCCESS: Checked {count} manager icons, no text found.")
        else:
            print("WARNING: No manager icons found.")

    except Exception as e:
        print(f"Leagues page error: {e}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_changes(page)
        finally:
            browser.close()
