import apiClient from './client'

function toFormData(payload) {
  const params = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry === undefined || entry === null) {
          return
        }
        params.append(key, String(entry))
      })
      return
    }
    params.append(key, String(value))
  })
  return params
}

export async function createProject(organizationId, actorUsername, payload) {
  if (!organizationId) {
    throw new Error('organizationId is required')
  }
  if (!actorUsername) {
    throw new Error('actorUsername is required')
  }

  const params = toFormData({
    username: actorUsername,                    // WYMAGANE przez backend
    name: payload.name,
    description: payload.description || "",
    start_dte: payload.start_dte,
    end_dte: payload.end_dte,
    coordinator_username: payload.coordinator_username, // WYMAGANE
  })

  const response = await apiClient.post(`project/create/${organizationId}/`, params)
  return response.data
}

export async function updateProject(organizationId, projectId, actorUsername, payload) {
  if (!organizationId) {
    throw new Error('organizationId is required')
  }
  if (!projectId) {
    throw new Error('projectId is required')
  }
  if (!actorUsername) {
    throw new Error('actorUsername is required')
  }

  const response = await apiClient.put(`project/update/${organizationId}/${projectId}/`, {
    username: actorUsername,                   // WYMAGANE
    name: payload.name,
    description: payload.description || "",
    start_dte: payload.start_dte,
    end_dte: payload.end_dte,
    coordinator_username: payload.coordinator_username, // jeśli zmieniono
  })

  return response.data
}

export async function getAllProjects(organizationId, actorUsername) {
  if (!organizationId) {
    throw new Error('organizationId is required')
  }
  if (!actorUsername) {
    throw new Error('actorUsername is required')
  }

  const response = await apiClient.get(`projects/all/${organizationId}/`, {
    params: { username: actorUsername },
  })

  return response.data
}

export async function getUserProjects(organizationId, actorUsername) {
  if (!organizationId) {
    throw new Error('organizationId is required')
  }
  if (!actorUsername) {
    throw new Error('actorUsername is required')
  }

  const response = await apiClient.get(`projects/my/${organizationId}/`, {
    params: { username: actorUsername },
  })

  return response.data
}

export async function deleteProject(organizationId, projectId, actorUsername) {
  if (!organizationId) {
    throw new Error('organizationId is required')
  }
  if (!projectId) {
    throw new Error('projectId is required')
  }
  if (!actorUsername) {
    throw new Error('actorUsername is required')
  }

  const response = await apiClient.delete(`project/delete/${organizationId}/${projectId}/`, {
    params: { username: actorUsername },
  })

  return response.data
}
