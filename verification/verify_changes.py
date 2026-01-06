
from playwright.sync_api import sync_playwright, expect

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        BASE_URL = "http://localhost:8000/src"
        TEAM_ID = "2" # A valid team ID for testing

        # Set team_id in localStorage to simulate a logged-in user
        page.goto(f"{BASE_URL}/index.html")
        page.evaluate(f"localStorage.setItem('fpl_team_id', '{TEAM_ID}')")

        try:
            # 1. Dashboard Verification
            print("Verifying Dashboard...")
            page.reload()
            # Wait for pitch to be populated
            expect(page.get_by_text("Alisson").first).to_be_visible(timeout=10000)
            page.screenshot(path="verification/dashboard.png", full_page=True)
            print("Dashboard screenshot saved.")

            # 2. Stats Verification
            print("Verifying Stats Page...")
            page.goto(f"{BASE_URL}/stats.html")
            # Wait for player name to be updated from mock data.
            # Using specific class selector to avoid strict mode violation with header h1
            expect(page.locator('h1.text-2xl')).not_to_have_text('Erling Haaland', timeout=10000)
            page.screenshot(path="verification/stats.png", full_page=True)
            print("Stats screenshot saved.")

            # 3. Rivals Verification
            print("Verifying Rivals Page...")
            page.goto(f"{BASE_URL}/rivals.html")
            # Wait for key differentials to load
            expect(page.get_by_text("Form").first).to_be_visible(timeout=10000)
            page.screenshot(path="verification/rivals.png", full_page=True)
            print("Rivals screenshot saved.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            page.screenshot(path="verification/error.png", full_page=True)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_changes()
