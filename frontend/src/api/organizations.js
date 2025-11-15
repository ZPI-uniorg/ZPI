import apiClient from './client'

export async function listOrganizations() {
  const response = await apiClient.get('organizations/')
  return response.data
}

export async function createOrganization(payload) {
  const response = await apiClient.post('organizations/', payload)
  return response.data
}

export async function registerOrganization(payload) {
  const response = await apiClient.post('organizations/register/', payload)
  return response.data
}

export async function getOrganizationMembers(organizationId) {
  const response = await apiClient.get(`organizations/${organizationId}/members/`)
  return response.data
}

export async function addOrganizationMember(organizationId, payload) {
  const response = await apiClient.post(`organizations/${organizationId}/members/`, payload)
  return response.data
}

export async function updateOrganizationMember(organizationId, memberId, payload) {
  const response = await apiClient.patch(`organizations/${organizationId}/members/${memberId}/`, payload)
  return response.data
}

export async function removeOrganizationMember(organizationId, memberId) {
  await apiClient.delete(`organizations/${organizationId}/members/${memberId}/`)
}
