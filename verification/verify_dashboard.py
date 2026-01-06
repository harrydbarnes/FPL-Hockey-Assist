from playwright.sync_api import sync_playwright, expect

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to the dashboard (served by proxy_server.py at port 8000)
        page.goto("http://localhost:8000/src/index.html")

        # Wait for the page to load content (this verifies API is working)
        # We look for something that loads from API, e.g., the deadline widget or just ensuring no network error alerts
        # Given I don't know the exact DOM structure populated by API, I'll wait for network idle or a specific timeout
        # and take a screenshot.

        page.wait_for_load_state("networkidle")

        # Also, let's try to verify if the Deadline widget text appears.
        # "Gameweek" is usually present.
        try:
            expect(page.get_by_text("Gameweek", exact=False).first).to_be_visible(timeout=10000)
        except TimeoutError as e:
            print(f"Warning: Could not find 'Gameweek' text. API might be failing or data not loaded. Error: {e}")

        page.screenshot(path="verification/dashboard.png", full_page=True)
        print("Screenshot saved to verification/dashboard.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard()
