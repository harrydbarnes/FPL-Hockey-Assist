from playwright.sync_api import sync_playwright, expect

def verify_rivals_page(page):
    BASE_URL = "http://localhost:8000/src"
    TEAM_ID = "2"

    # Set a team ID in localStorage before navigating
    # This simulates a user having already logged in
    # Use src/index.html to set local storage, or any existing page
    page.goto(f"{BASE_URL}/index.html")

    # Execute script to set local storage
    # Team ID 35868 is usually a valid one (or low number like 2)
    page.evaluate(f"localStorage.setItem('fpl_team_id', '{TEAM_ID}')")

    # Now go to rivals page
    page.goto(f"{BASE_URL}/rivals.html")

    # Wait for the main content to load
    # The h1 should eventually contain the league name or something dynamic
    # The 'Form' text is part of the Key Differentials section which is populated via JS

    # Wait for the Key Differentials container to be populated
    # It is a div with class 'flex flex-col gap-3' inside the main area
    # In renderKeyDifferentials we append rows to it.

    # We can look for text "Form" which is added in the rightDiv of the differential row
    expect(page.get_by_text("Form").first).to_be_visible(timeout=10000)

    # Take screenshot
    page.screenshot(path="verification/rivals_page.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_rivals_page(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
