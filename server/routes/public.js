import { readFileSync } from 'node:fs'
import { many, one } from '../db.js'
import { notFound } from '../http.js'
import { isUuid } from '../validate.js'
import {
  PROJECT_SELECT,
  getSettings,
  projectMembers,
  serializeMember,
  serializeProject,
  serializeService,
} from '../content.js'

let appVersion
function readVersion() {
  if (appVersion === undefined) {
    try {
      appVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version
    } catch {
      appVersion = null
    }
  }
  return appVersion
}

async function health() {
  return { status: 'ok', version: readVersion() }
}

async function site() {
  const [settings, counts] = await Promise.all([
    getSettings(),
    one(`select
      (select count(*)::int from team_members where published) as team,
      (select count(*)::int from projects where published) as projects,
      (select count(*)::int from services where active) as services`),
  ])
  return { settings, counts }
}

async function listServices() {
  const rows = await many('select * from services where active order by sort_order, name')
  return { services: rows.map((row) => serializeService(row)) }
}

async function listTeam({ query }) {
  const conditions = ['published']
  const params = []
  const availability = query.get('availability')
  if (availability && ['available', 'limited', 'unavailable'].includes(availability)) {
    params.push(availability)
    conditions.push(`availability = $${params.length}`)
  }
  const type = query.get('type')
  if (type && ['owner', 'employee'].includes(type)) {
    params.push(type)
    conditions.push(`member_type = $${params.length}`)
  }
  const skill = query.get('skill')
  if (skill) {
    params.push(skill.toLowerCase())
    conditions.push(`exists (select 1 from unnest(skills) s where lower(s) = $${params.length})`)
  }
  const q = query.get('q')
  if (q) {
    params.push(`%${q.toLowerCase().slice(0, 80)}%`)
    const n = params.length
    conditions.push(
      `(lower(full_name) like $${n} or lower(title) like $${n} or lower(headline) like $${n} or exists (select 1 from unnest(skills) s where lower(s) like $${n}))`,
    )
  }
  const rows = await many(
    `select * from team_members where ${conditions.join(' and ')}
     order by case member_type when 'owner' then 0 else 1 end, sort_order, full_name`,
    params,
  )
  const skills = await many(
    `select distinct s as skill from team_members, unnest(skills) s where published order by s`,
  )
  return { members: rows.map((row) => serializeMember(row)), skills: skills.map((row) => row.skill) }
}

async function getMember({ params }) {
  const row = await one('select * from team_members where slug = $1 and published', [params.slug])
  if (!row) throw notFound('This team member could not be found.')
  const projects = await many(
    `${PROJECT_SELECT}
     join project_members pm on pm.project_id = p.id
     where pm.member_id = $1 and p.published
     order by p.featured desc, p.completed_on desc nulls last, p.created_at desc`,
    [row.id],
  )
  const member = serializeMember(row)
  return {
    member: { ...member, bio: row.bio, languages: row.languages },
    projects: projects.map((project) => serializeProject(project)),
  }
}

async function listProjects({ query }) {
  const conditions = ['p.published']
  const params = []
  if (query.get('featured') === 'true') conditions.push('p.featured')
  const service = query.get('service')
  if (service) {
    params.push(service)
    conditions.push(`s.slug = $${params.length}`)
  }
  const rows = await many(
    `${PROJECT_SELECT} where ${conditions.join(' and ')}
     order by p.featured desc, p.completed_on desc nulls last, p.created_at desc`,
    params,
  )
  return { projects: rows.map((row) => serializeProject(row)) }
}

async function getProject({ params }) {
  const row = await one(`${PROJECT_SELECT} where p.slug = $1 and p.published`, [params.slug])
  if (!row) throw notFound('This project could not be found.')
  const members = await projectMembers(row.id)
  return {
    project: { ...serializeProject(row), description: row.description },
    team: members.map((member) => serializeMember(member)),
  }
}

async function getMedia({ params, res }) {
  if (!isUuid(params.id)) throw notFound('Image not found.')
  const row = await one('select mime_type, data from media where id = $1', [params.id])
  if (!row) throw notFound('Image not found.')
  res.statusCode = 200
  res.setHeader('Content-Type', row.mime_type)
  res.setHeader('Content-Length', row.data.length)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(row.data)
}

export default [
  { method: 'GET', path: '/api/health', handler: health },
  { method: 'GET', path: '/api/site', handler: site },
  { method: 'GET', path: '/api/services', handler: listServices },
  { method: 'GET', path: '/api/team', handler: listTeam },
  { method: 'GET', path: '/api/team/:slug', handler: getMember },
  { method: 'GET', path: '/api/projects', handler: listProjects },
  { method: 'GET', path: '/api/projects/:slug', handler: getProject },
  { method: 'GET', path: '/api/media/:id', handler: getMedia },
]
