import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText("Indiana's tech community")
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in')
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
    // level 1: the page's one top-level heading, styled down rather than demoted.
    await expect(page.getByRole('heading', { level: 1, name: 'Indy Tech Events' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search events' })).toBeVisible()

    // List / Calendar / Map tabs, with Calendar the landing view on a desktop. Date independent: the
    // tabs render whether or not the seed has upcoming events.
    await expect(page.getByRole('button', { name: 'Calendar', exact: true })).toHaveClass(
      /tabs__btn--active/
    )
    await expect(page.locator('.cal')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Grid', exact: true })).toHaveCount(0)

    // The topic filter sidebar is gone; its calls to action are not.
    await expect(page.getByRole('link', { name: 'Submit an Event' })).toBeVisible()

    await page.getByRole('button', { name: 'Map', exact: true }).click()
    await expect(page.locator('.cal')).toHaveCount(0)
  })

  test('calendar page lands on the list on a phone-width screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/calendar')

    await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveClass(
      /tabs__btn--active/
    )
    await expect(page.locator('.event-list')).toBeVisible()

    // The month grid is still a tap away, with its day-by-day agenda.
    await page.getByRole('button', { name: 'Calendar', exact: true }).click()
    await expect(page.locator('.cal__agenda')).toBeVisible()
  })

  test('slack page loads', async ({ page }) => {
    await page.goto('/slack')
    await expect(page.getByRole('heading', { level: 1, name: 'Join us on Slack' })).toBeVisible()
    // Matches the email field's accessible name whether it comes from the newer
    // visible "Email" label or the older "Email address" aria-label.
    await expect(page.getByRole('textbox', { name: /^Email/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send me an invite' })).toBeVisible()
  })
})
