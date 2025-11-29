import apiClient from './client'

function toFormData(payload) {
  const params = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  return params
}

function buildDateTime(date, time) {
  if (!date) return ''
  if (!time) return `${date} 00:00:00`
  return `${date} ${time}:00`
}

function buildPermissionsString(combinations) {
  if (!Array.isArray(combinations) || combinations.length === 0) return ''
  return combinations
    .map(combo => combo.filter(Boolean).join('+'))
    .filter(s => s.length > 0)
    .join(',')
}

export async function createEvent(organizationId, actorUsername, payload) {
  const params = new URLSearchParams()
  params.append('username', actorUsername)
  params.append('name', payload.name || payload.title || '')
  params.append('description', payload.description || '')
  params.append('start_time', buildDateTime(payload.date, payload.start_time))
  params.append('end_time', buildDateTime(payload.endDate || payload.date, payload.end_time))
  params.append('permissions', buildPermissionsString(payload.combinations || []))
  const response = await apiClient.post(`events/create/${organizationId}/`, params)
  return response.data
}

export async function updateEvent(organizationId, eventId, actorUsername, payload) {
  const response = await apiClient.put(
    `events/update/${organizationId}/${eventId}/`,
    {
      username: actorUsername,
      name: payload.name || payload.title || '',
      description: payload.description || '',
      start_time: buildDateTime(payload.date, payload.start_time),
      end_time: buildDateTime(payload.endDate || payload.date, payload.end_time),
      permissions: buildPermissionsString(payload.combinations || []),
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
  return response.data
}

export async function deleteEvent(organizationId, eventId, actorUsername) {
  await apiClient.delete(`events/delete/${organizationId}/${eventId}/`, {
    headers: { 'Content-Type': 'application/json' },
    data: { username: actorUsername },
  })
}

export async function getAllEvents(organizationId, actorUsername) {
  const response = await apiClient.get(`events/all/${organizationId}/`, {
    params: { username: actorUsername },
  })
  return response.data
}

export async function getUserEvents(organizationId, actorUsername) {
  const response = await apiClient.get(`events/my/${organizationId}/${actorUsername}/`)
  return response.data
}
