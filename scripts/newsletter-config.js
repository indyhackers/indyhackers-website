// logoUrl: publicly accessible image URL used to embed the logo in the Google Doc
export const SPONSORS = [
  {
    name: 'MadeLabs Technology',
    url: 'https://madelabs.io',
    description: 'Custom software development',
    logoUrl: 'https://www.indyhackers.org/images/sponsors/madelabs.png',
  },
  {
    name: 'Pure Insights',
    url: 'https://pureinsights.com',
    description: 'Data and analytics consulting',
    logoUrl: 'https://www.indyhackers.org/images/sponsors/pureinsights.png',
  },
  {
    name: 'Java House',
    url: 'https://javahouse.com',
    description: 'Coffee and community',
    logoUrl: 'https://www.indyhackers.org/images/sponsors/java_house.png',
  },
  {
    name: 'E-gineering',
    url: 'https://www.e-gineering.com',
    description: '',
    logoUrl: 'https://www.indyhackers.org/images/sponsors/egineering-logo.png',
  },
  {
    name: 'Panfactum',
    url: 'https://www.panfactum.com',
    description: '',
    logoUrl: 'https://www.indyhackers.org/images/sponsors/panfactum-logo.png',
  },
]

// How many recent approved jobs to include
export const JOBS_LIMIT = 10

// How many days ahead to pull from Google Calendar
export const CALENDAR_DAYS_AHEAD = 45

// Prefix for the generated Google Doc title
export const DOC_TITLE_PREFIX = 'IndyHackers Newsletter Draft'

// Google Workspace user the service account impersonates via Domain-Wide Delegation
export const IMPERSONATE_USER = 'josh@indyhackers.org'
