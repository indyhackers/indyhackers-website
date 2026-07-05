import HomeView from '../views/HomeView.vue'

// vite-ssg owns router creation (it picks web vs. memory history for the client
// vs. the prerender), so this module just exports the route table and options.
export function scrollBehavior() {
  return { top: 0 }
}

export const routes = [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
      props: { title: 'Home', content: 'Welcome to IndyHackers.' }
      // No meta.title → uses the default site title ("IndyHackers — Indiana's
      // Tech Community") and the default description.
    },
    {
      path: '/jobs',
      name: 'Jobs',
      component: () => import('../views/OmniView.vue'),
      props: { currentComponent: 'JobsList' },
      meta: {
        title: 'Tech Jobs in Indianapolis',
        description:
          'Browse developer and tech job openings from Indianapolis-area companies, posted to the IndyHackers community.'
      }
    },
    {
      path: '/job',
      component: () => import('../views/OmniView.vue'),
      props: { currentComponent: 'JobListing' },
      // A single job listing; JobListing.vue overrides title/description with
      // the specific job once it loads.
      meta: { title: 'Job Listing' }
    },
    {
      path: '/jobs-markdown',
      name: 'JobsMarkdown',
      component: () => import('../components/jobs/JobsMarkdown.vue'),
      meta: { noindex: true }
    },
    {
      path: '/jobs/manage',
      name: 'ManageJob',
      component: () => import('../components/jobs/ManageJobView.vue'),
      meta: { noindex: true }
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/AboutView.vue'),
      meta: {
        title: 'About',
        description:
          "Learn about IndyHackers — Indiana's tech community since 2017: our meetups, our mission, and how to get involved."
      }
    },
    {
      path: '/privacy',
      name: 'Privacy',
      component: () => import('../views/PrivacyView.vue'),
      meta: {
        title: 'Privacy Policy',
        description: 'How IndyHackers collects, uses, and protects your data.'
      }
    },
    {
      path: '/terms',
      name: 'Terms',
      component: () => import('../views/TermsView.vue'),
      meta: {
        title: 'Terms of Service',
        description: 'The terms of service for using the IndyHackers website and community.'
      }
    },
    {
      path: '/support',
      name: 'Support',
      component: () => import('../views/SupportView.vue'),
      meta: {
        title: 'Support',
        description: 'Get help with the IndyHackers website, events, job board, and Slack.'
      }
    },
    {
      path: '/resources',
      name: 'Resources',
      component: () => import('../views/ResourcesView.vue'),
      meta: {
        title: 'Slack Resources',
        description:
          "Information about our Slack such as channel info and more!"
      }
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('../components/admin/AdminHome.vue'),
      meta: { noindex: true }
    },
    {
      path: '/admin/console',
      name: 'AdminConsole',
      component: () => import('../components/AdminLogin.vue'),
      meta: { noindex: true }
    },
    {
      path: '/admin/jobs',
      name: 'JobApprovals',
      component: () => import('../components/admin/JobApprovals.vue'),
      meta: { noindex: true }
    },
    {
      path: '/admin/slack-invites',
      name: 'SlackInvites',
      component: () => import('../components/admin/SlackInvites.vue'),
      meta: { noindex: true }
    },
    {
      path: '/not-authorized',
      name: 'NotAuthorized',
      component: () => import('../components/NotAuthorized.vue'),
      meta: { noindex: true }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../components/LoginPage.vue'),
      meta: { noindex: true }
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../components/SignupPage.vue'),
      meta: { noindex: true }
    },
    {
      path: '/sponsors',
      name: 'Sponsors',
      component: () => import('../views/SponsorsView.vue'),
      meta: {
        title: 'Sponsors',
        description:
          'Meet the companies sponsoring IndyHackers and supporting the Indianapolis tech community.'
      }
    },
    {
      path: '/newsletter',
      name: 'Newsletter',
      component: () => import('../components/NewsletterView.vue'),
      meta: {
        title: 'Newsletter — Hacks & Happenings',
        description:
          'Hacks & Happenings: an occasional roundup of local developer projects, blog posts, and Indianapolis tech events, delivered to your inbox.'
      }
    },
    {
      path: '/recommend-event',
      name: 'RecommendEvent',
      component: () => import('../components/EventRecommendationForm.vue'),
      meta: {
        title: 'Recommend an Event',
        description:
          'Suggest a tech event, meetup, or workshop for the IndyHackers community calendar.'
      }
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../components/CalendarView.vue'),
      meta: {
        title: 'Tech Events in Indianapolis',
        description:
          'Upcoming tech meetups, workshops, and developer events around Indianapolis.'
      }
    },
    { path: '/events', redirect: '/calendar' },
    {
      path: '/event/:id',
      name: 'EventDetail',
      component: () => import('../views/EventDetailView.vue')
    },
    {
      path: '/events-markdown',
      name: 'EventsMarkdown',
      component: () => import('../components/EventsMarkdown.vue'),
      meta: { noindex: true }
    },
    {
      path: '/code-of-conduct',
      name: 'CodeOfConduct',
      component: () => import('../components/CodeOfConduct.vue'),
      meta: {
        title: 'Code of Conduct',
        description: 'The code of conduct for the IndyHackers community, events, and Slack.'
      }
    },
    {
      path: '/slack',
      name: 'Slack',
      component: () => import('../components/SlackView.vue'),
      meta: {
        title: 'Join the IndyHackers Slack',
        description:
          "Request an invite to the IndyHackers Slack — Indianapolis's community of developers, designers, and tech founders."
      }
    },
  ]
