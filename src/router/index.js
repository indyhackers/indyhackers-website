import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import pocketbase, { isAdmin } from '../pocketbase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
      props: { title: 'Home', content: 'Welcome to IndyHackers.' }
    },
    {
      path: '/jobs',
      name: 'Jobs',
      component: () => import('../views/OmniView.vue'),
      props: { currentComponent: 'JobsList' }
    },
    {
      path: '/job',
      component: () => import('../views/OmniView.vue'),
      props: { currentComponent: 'JobListing' }
    },
    {
      path: '/jobs-markdown',
      name: 'JobsMarkdown',
      component: () => import('../components/jobs/JobsMarkdown.vue')
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/privacy',
      name: 'Privacy',
      component: () => import('../views/PlaceholderView.vue'),
      props: { title: 'Privacy Policy', content: 'Our privacy policy.' }
    },
    {
      path: '/terms',
      name: 'Terms',
      component: () => import('../views/PlaceholderView.vue'),
      props: { title: 'Terms of Service', content: 'Our terms of service.' }
    },
    {
      path: '/support',
      name: 'Support',
      component: () => import('../views/PlaceholderView.vue'),
      props: { title: 'Support', content: 'Get support.' }
    },
    { path: '/admin', name: 'Admin', component: () => import('../components/admin/AdminHome.vue') },
    { path: '/admin/console', name: 'AdminConsole', component: () => import('../components/AdminLogin.vue') },
    { path: '/admin/jobs', name: 'JobApprovals', component: () => import('../components/admin/JobApprovals.vue') },
    {
      path: '/not-authorized',
      name: 'NotAuthorized',
      component: () => import('../components/NotAuthorized.vue')
    },
    { path: '/login', name: 'Login', component: () => import('../components/LoginPage.vue') },
    { path: '/signup', name: 'Signup', component: () => import('../components/SignupPage.vue') },
    { path: '/sponsors', name: 'Sponsors', component: () => import('../views/SponsorsView.vue') },
    {
      path: '/newsletter',
      name: 'Newsletter',
      component: () => import('../components/NewsletterView.vue')
    },
    {
      path: '/recommend-event',
      name: 'RecommendEvent',
      component: () => import('../components/EventRecommendationForm.vue')
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../components/CalendarView.vue')
    },
    { path: '/events', redirect: '/calendar' },
    {
      path: '/events-markdown',
      name: 'EventsMarkdown',
      component: () => import('../components/EventsMarkdown.vue')
    },
    {
      path: '/code-of-conduct',
      name: 'CodeOfConduct',
      component: () => import('../components/CodeOfConduct.vue')
    },
    {
      path: '/slack',
      name: 'Slack',
      component: () => import('../components/SlackView.vue')
    },
    {
      path: '/admin/slack-invites',
      name: 'SlackInvites',
      component: () => import('../components/admin/SlackInvites.vue')
    }
  ]
})

// Gate everything under /admin: must be signed in as a user with the admin role,
// otherwise bounce to /login (preserving where they were headed).
router.beforeEach(async (to) => {
  if (!to.path.startsWith('/admin')) return true

  // Not signed in at all → login (preserving the destination).
  if (!pocketbase.authStore.isValid) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (isAdmin()) return true

  // Signed in but the auth record didn't carry roles (e.g. older session) —
  // verify once against the server before deciding.
  try {
    const me = await pocketbase
      .collection('users')
      .getOne(pocketbase.authStore.record.id, { expand: 'roles' })
    const roles = me.expand?.roles ?? []
    if (roles.some((r) => r?.name === 'admin')) return true
  } catch {
    // fall through
  }
  // Signed in but not an admin → not authorized.
  return { name: 'NotAuthorized' }
})

export default router
