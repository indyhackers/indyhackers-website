import { test, expect } from '@playwright/test'

// These exercise the event submission / ownership / admin screens against the
// MSW-mocked dev server (npm run dev on :5173). The dev auth mock signs any
// credentials in as a board admin (id "devadmin"), and eventMocks seeds a
// pending submission, an owned event, and a pending ownership claim.

async function login(page) {
  await page.goto('/login')
  await page.fill('#email', 'admin@indyhackers.org')
  await page.fill('#password', 'whatever')
  await page.click('button[type="submit"]')
  // Wait until the session is stored before navigating on.
  await page.waitForFunction(() => !!localStorage.getItem('pocketbase_auth'))
}

test('submit an event shows the pending-approval confirmation', async ({ page }) => {
  await login(page)
  await page.goto('/events/submit')
  await expect(page.locator('h1')).toHaveText('Submit an Event')

  await page.fill('#event-title', 'Playwright Test Meetup')
  await page.fill('#event-start', '2026-09-15T18:00')
  await page.click('button[type="submit"]')

  await expect(page.getByText('pending board approval')).toBeVisible()
})

test('my events lists owned and pending events with the right badges', async ({ page }) => {
  await login(page)
  await page.goto('/events/mine')
  await expect(page.locator('h1')).toHaveText('Your events')

  // Owned, published event.
  await expect(page.getByText('IndyPy: Python in Production')).toBeVisible()
  await expect(page.getByText('Live', { exact: true })).toBeVisible()
  // Submitted, awaiting approval.
  await expect(page.getByText('Indy Data Engineering Night')).toBeVisible()
  await expect(page.getByText('Pending review')).toBeVisible()
})

test('admin events screen shows queues and can approve a submission', async ({ page }) => {
  await login(page)
  await page.goto('/admin/events')
  await expect(page.locator('h1')).toHaveText('Events')

  // Pending submission + ownership claim are both visible.
  const pendingRow = page.locator('table').first().getByText('Indy Data Engineering Night')
  await expect(pendingRow).toBeVisible()
  await expect(page.getByText('Pat Planner')).toBeVisible()

  // Approve the pending submission; its row leaves the pending table.
  await page
    .locator('tr', { hasText: 'Indy Data Engineering Night' })
    .first()
    .getByRole('button', { name: 'Approve' })
    .click()
  await expect(page.getByText(/Approved "Indy Data Engineering Night"/)).toBeVisible()
})

test('event detail offers an ownership claim to a signed-in non-owner', async ({ page }) => {
  await login(page)
  // evt_llm has no owner in the mocks, so a claim should be offered.
  await page.goto('/event/evt_llm')
  await expect(page.getByRole('button', { name: 'Claim ownership' })).toBeVisible()
  await page.getByRole('button', { name: 'Claim ownership' }).click()
  await expect(page.getByText(/ownership claim was submitted/)).toBeVisible()
})
