
from playwright.sync_api import sync_playwright
import time

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Dashboard Verification
        print("Verifying Dashboard...")
        page.goto("http://localhost:8000/src/index.html")
        page.wait_for_timeout(2000) # Wait for JS to run/mock data to be visible

        # Screenshot Dashboard
        page.screenshot(path="verification/dashboard.png", full_page=True)
        print("Dashboard screenshot saved.")

        # 2. Stats Verification
        print("Verifying Stats Page...")
        page.goto("http://localhost:8000/src/stats.html")
        page.wait_for_timeout(2000)

        # Screenshot Stats
        page.screenshot(path="verification/stats.png", full_page=True)
        print("Stats screenshot saved.")

        # 3. Rivals Verification
        print("Verifying Rivals Page...")
        page.goto("http://localhost:8000/src/rivals.html")
        page.wait_for_timeout(2000)

        # Screenshot Rivals
        page.screenshot(path="verification/rivals.png", full_page=True)
        print("Rivals screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_changes()
