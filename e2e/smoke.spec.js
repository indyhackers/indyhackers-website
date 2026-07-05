import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      "Indiana's tech community"
    )
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in with')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign Up')
    await expect(page.locator('#confirmPassword')).toBeVisible()
  })

  test('jobs page loads with mock data', async ({ page }) => {
    await page.goto('/jobs')
    await expect(page.getByText('Data Product Owner')).toBeVisible()
  })

  test('calendar page loads', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByRole('heading', { level: 1, name: 'Event Calendar' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search events' })).toBeVisible()
    // Topic filters come from MSW (static seed data) — not tied to upcoming event dates.
    await expect(page.getByRole('button', { name: 'Python' })).toBeVisible()
  })
})
