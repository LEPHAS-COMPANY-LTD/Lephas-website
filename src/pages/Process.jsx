import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { PageHeader } from '../components/ui.jsx'
import { usePageMeta } from '../lib/useAsync.js'

const stages = [
  {
    icon: 'chat',
    title: 'Discovery',
    time: 'Day 1 to 3',
    text: 'You send your idea through the project form, the contact form or WhatsApp. We reply with questions and book a short call to understand your goals, users and budget.',
    deliverables: ['Reference number and private request page', 'Discovery call', 'List of must-have features'],
  },
  {
    icon: 'receipt',
    title: 'Proposal',
    time: 'Within a week',
    text: 'We send a written proposal with scope, timeline, the team who will work on it and the price: fixed, hourly or monthly.',
    deliverables: ['Scope and milestones', 'Named developers', 'Clear price and payment plan'],
  },
  {
    icon: 'pen',
    title: 'Design',
    time: '1 to 2 weeks',
    text: 'For new products we design the key screens first, so you can see and change the look before building starts.',
    deliverables: ['Wireframes', 'Visual design', 'Clickable prototype'],
  },
  {
    icon: 'code',
    title: 'Build',
    time: 'Weekly sprints',
    text: 'We build in short sprints and show you working progress every week. You give feedback through your request page or a quick call.',
    deliverables: ['Weekly demo link', 'Progress updates', 'Testing on phones and desktops'],
  },
  {
    icon: 'rocket',
    title: 'Launch',
    time: 'Launch day',
    text: 'We put your site or app live, connect your domain, set up analytics and hand over every account and the source code.',
    deliverables: ['Go-live', 'Handover of code and logins', 'Short training session'],
  },
  {
    icon: 'wrench',
    title: 'Support',
    time: 'Ongoing',
    text: 'After launch we fix issues, keep everything updated and add new features when you are ready to grow.',
    deliverables: ['Bug fixes', 'Security updates', 'New features on request'],
  },
]

export default function Process() {
  usePageMeta('Our process', 'How Lephas takes your project from idea to launch: discovery, proposal, design, build, launch and support.')
  return (
    <div>
      <PageHeader eyebrow="How we work" title="A clear process, from first message to launch">
        You always know what is happening, who is working on it and what comes next.
      </PageHeader>
      <ol className="relative space-y-8">
        {stages.map((stage, index) => (
          <li key={stage.title} className="neu grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr_16rem] md:items-start">
            <div className="flex items-center gap-4 md:flex-col">
              <span className="icon-well">
                <Icon name={stage.icon} />
              </span>
              <span className="text-3xl font-bold text-silver">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-slate">{stage.title}</h2>
                <span className="chip">{stage.time}</span>
              </div>
              <p className="mt-3 text-muted">{stage.text}</p>
            </div>
            <ul className="neu-inset-sm space-y-2 p-4 text-sm">
              {stage.deliverables.map((item) => (
                <li key={item} className="flex gap-2 text-slate">
                  <Icon name="check" size={18} className="shrink-0 text-sky-deep" />
                  {item}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="mt-14 text-center">
        <Link to="/start" className="btn btn-primary">
          Start with discovery
          <Icon name="arrow" size={18} />
        </Link>
      </div>
    </div>
  )
}
