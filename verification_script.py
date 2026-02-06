from playwright.sync_api import sync_playwright
import os

def test_recipes_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Inject E2E session to bypass auth if needed (based on memory)
        # "To bypass authentication guards ... inject window.__E2E_SESSION__ and set activeOrgId in localStorage"

        page = context.new_page()

        # Navigate to home first to set local storage
        page.goto("http://localhost:4173/")

        # Set localStorage
        page.evaluate("""() => {
            localStorage.setItem('activeOrgId', 'test-org-id');
            window.__E2E_SESSION__ = { user: { id: 'test-user' } };
        }""")

        # Navigate to recipes
        page.goto("http://localhost:4173/recipes")

        # Wait a bit
        page.wait_for_timeout(3000)

        # Take screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/recipes_page.png")

        browser.close()

if __name__ == "__main__":
    test_recipes_page()
