from playwright.sync_api import sync_playwright

def verify_initials():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Set a valid team ID (using a known ID, e.g., 35868)
            page.goto('http://localhost:8000/src/index.html')

            # Inject local storage
            page.evaluate("localStorage.setItem('fpl_team_id', '35868')")

            # 1. Verify Leagues Page (where user saw initials)
            page.goto('http://localhost:8000/src/leagues.html')
            page.wait_for_selector('table', timeout=10000)

            # Wait for rows to appear
            page.wait_for_selector('tbody tr', timeout=10000)

            # Take a screenshot
            page.screenshot(path='verification/leagues_page.png')
            print("Captured verification/leagues_page.png")

            # Check if initials are present in the DOM
            # The manager icon textContent should be empty if initials are hidden
            # In renderLeagueTable, it calls createManagerIcon(..., false)
            # So textContent should be empty.

            icons = page.query_selector_all('tbody tr td div div[data-alt*="color"]')
            # Note: createManagerIcon doesn't set data-alt on the main div, createTeamIcon does.
            # createManagerIcon sets class 'size-8 rounded-full ...'
            # Let's target the icons by structure: 3rd column -> div -> div (icon)

            # Or inspect text content of the icons
            # We can select the icon divs and print their text content

            # Select all rows
            rows = page.query_selector_all('tbody tr')
            for i, row in enumerate(rows):
                # 3rd column is Team & Manager
                cols = row.query_selector_all('td')
                if len(cols) > 2:
                    team_col = cols[2]
                    # The icon is the first child of the div inside the td
                    icon_div = team_col.query_selector('div > div.rounded-full')
                    if icon_div:
                        text = icon_div.inner_text()
                        print(f"Row {i} Icon Text: '{text}'")

            # 2. Verify Rivals Page Sidebar (just in case)
            page.goto('http://localhost:8000/src/rivals.html')
            page.wait_for_selector('aside', timeout=10000)
            # Wait for sidebar standings
            page.wait_for_selector('aside .flex.flex-col.gap-2 .group', timeout=10000)

            page.screenshot(path='verification/rivals_sidebar_before.png')
            print("Captured verification/rivals_sidebar_before.png")

            # Check sidebar icons text
            sidebar_icons = page.query_selector_all('aside .flex.flex-col.gap-2 .group div.rounded-full')
            for i, icon in enumerate(sidebar_icons):
                text = icon.inner_text()
                print(f"Sidebar Row {i} Icon Text: '{text}'")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_initials()
