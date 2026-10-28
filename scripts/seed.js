import { closePool, one } from '../server/db.js'

const services = [
  {
    slug: 'business-websites',
    name: 'Business & company websites',
    category: 'Websites',
    icon: 'globe',
    summary: 'A fast, professional website that explains what you do and turns visitors into enquiries.',
    features: ['Custom design in your brand', 'Mobile-first and fast', 'Contact and quote forms', 'Search engine basics (SEO)'],
  },
  {
    slug: 'ecommerce-stores',
    name: 'E-commerce stores',
    category: 'Websites',
    icon: 'cart',
    summary: 'An online shop with products, cart, checkout and payments your customers trust.',
    features: ['Product catalogue and stock', 'Cart and checkout', 'Card and mobile money payments', 'Order management'],
  },
  {
    slug: 'portfolio-websites',
    name: 'Portfolio & personal websites',
    category: 'Websites',
    icon: 'user',
    summary: 'A personal site that shows your work, skills and story, ready to share with clients or employers.',
    features: ['Project gallery', 'About and CV sections', 'Contact form', 'Easy to update'],
  },
  {
    slug: 'web-applications',
    name: 'Web applications',
    category: 'Apps',
    icon: 'layout',
    summary: 'Custom web apps, dashboards and customer portals built around how your business works.',
    features: ['User accounts and roles', 'Dashboards and reports', 'Integrations with your tools', 'Secure cloud hosting'],
  },
  {
    slug: 'mobile-apps',
    name: 'Mobile apps',
    category: 'Apps',
    icon: 'phone',
    summary: 'Android and iOS apps for your customers or your team, from idea to app store.',
    features: ['Android and iOS', 'Push notifications', 'Offline support', 'App store publishing'],
  },
  {
    slug: 'pos-business-systems',
    name: 'POS & business systems',
    category: 'Systems',
    icon: 'receipt',
    summary: 'Point-of-sale, inventory, booking and management systems that keep your operations running.',
    features: ['Sales and receipts', 'Stock and inventory', 'Staff accounts', 'Daily reports'],
  },
  {
    slug: 'apis-microservices',
    name: 'APIs & microservices',
    category: 'Systems',
    icon: 'server',
    summary: 'Reliable back-end services, APIs and integrations that connect your systems together.',
    features: ['REST APIs', 'Payment and SMS integrations', 'Databases and data migration', 'Monitoring'],
  },
  {
    slug: 'ui-ux-design',
    name: 'UI/UX design',
    category: 'Design',
    icon: 'pen',
    summary: 'Clear, attractive designs and prototypes before a single line of code is written.',
    features: ['User research', 'Wireframes', 'Clickable prototypes', 'Design systems'],
  },
  {
    slug: 'maintenance-support',
    name: 'Maintenance & support',
    category: 'Support',
    icon: 'wrench',
    summary: 'Updates, fixes, backups and improvements for websites and apps you already have.',
    features: ['Security updates', 'Bug fixes', 'Backups', 'Monthly improvements'],
  },
]

async function main() {
  let added = 0
  for (const [index, s] of services.entries()) {
    const row = await one(
      `insert into services (slug, name, category, summary, features, icon, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7) on conflict (slug) do nothing returning id`,
      [s.slug, s.name, s.category, s.summary, s.features, s.icon, (index + 1) * 10],
    )
    if (row) added += 1
  }
  console.log(`Seeded ${added} new service(s). Existing services were left unchanged.`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(closePool)
