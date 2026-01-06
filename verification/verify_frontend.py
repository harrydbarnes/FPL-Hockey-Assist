from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()

            # 1. Verify Bench Background (index.html)
            print("Verifying Dashboard/Bench...")
            # Note: path includes /src/ because proxy_server serves from root
            page.goto("http://localhost:8000/src/index.html")

            page.wait_for_selector("#bench-container")
            bench = page.locator("#bench-container")
            classes = bench.get_attribute("class")
            print(f"Bench classes: {classes}")

            expected_classes = ["bg-gradient-to-b", "from-gray-900/50", "backdrop-blur-sm"]
            for cls in expected_classes:
                assert cls in classes, f"Expected class '{cls}' not found in bench container"
            print("Bench background classes verification passed.")

            page.screenshot(path="verification/dashboard_bench.png")

            print("Verifying Clean Sheet Page...")
            page.goto("http://localhost:8000/src/clean-sheet.html")
            page.wait_for_selector(".size-8")
            page.screenshot(path="verification/clean_sheet.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_changes()
