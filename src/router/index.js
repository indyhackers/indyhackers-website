import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

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
    { path: '/admin', name: 'Admin', component: () => import('../components/AdminLogin.vue') },
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
    }
  ]
})

export default router
