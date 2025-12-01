import apiClient from "./client";

function toFormData(payload) {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params;
}

export async function registerOrganization(payload) {
  const params = toFormData({
    name: payload.organization?.name ?? "",
    description: payload.organization?.description ?? "",
    username: payload.admin?.username ?? "",
    email: payload.admin?.email ?? "",
    password: payload.admin?.password ?? "",
    password_confirm:
      payload.admin?.confirmPassword ?? payload.admin?.password ?? "",
    firstname: payload.admin?.first_name ?? "",
    lastname: payload.admin?.last_name ?? "",
  });
  const response = await apiClient.post("register-organization/", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return response.data;
}

export async function listOrganizations(username) {
  if (!username) {
    throw new Error("Username is required to fetch organizations");
  }
  const response = await apiClient.get(
    `organization/${encodeURIComponent(username)}/`
  );
  return response.data;
}

export async function getOrganizationMembers(organizationId, actorUsername) {
  const response = await apiClient.get(`members/${organizationId}/`, {
    params: { username: actorUsername },
  });
  return response.data;
}

export async function getProjectMembers(
  organizationId,
  projectId,
  actorUsername
) {
  const response = await apiClient.get(
    `project-members/${organizationId}/${projectId}/`,
    {
      params: { username: actorUsername },
    }
  );
  return response.data;
}

export async function addOrganizationMember(
  organizationId,
  adminUsername,
  payload
) {
  const params = toFormData({
    username: adminUsername,
    invitee_username: payload.username,
    invitee_email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    role: payload.role,
    password: payload.password,
  });
  const response = await apiClient.post(
    `invite-member/${organizationId}/`,
    params
  );
  return response.data;
}

export async function updateOrganizationMember(
  organizationId,
  memberUsername,
  adminUsername,
  payload
) {
  const response = await apiClient.put(
    `members/change-role/${organizationId}/${encodeURIComponent(
      memberUsername
    )}/`,
    {
      admin_username: adminUsername,
      new_role: payload.role,
    }
  );
  return response.data;
}

export async function removeOrganizationMember(
  organizationId,
  memberUsername,
  adminUsername
) {
  await apiClient.delete(
    `members/delete/${organizationId}/${encodeURIComponent(memberUsername)}/`,
    {
      data: { admin_username: adminUsername },
    }
  );
}

export async function updateOrganizationMemberProfile(
  organizationId,
  memberUsername,
  adminUsername,
  payload
) {
  const response = await apiClient.put(
    `members/update-profile/${organizationId}/${encodeURIComponent(
      memberUsername
    )}/`,
    {
      admin_username: adminUsername,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
    }
  );

  return response.data;
}

export async function createTag(organizationId, actorUsername, tagName) {
  const params = toFormData({
    username: actorUsername,
    name: tagName,
  });
  const response = await apiClient.post(
    `tags/create/${organizationId}/`,
    params
  );
  return response.data;
}

export async function getTags(organizationId, actorUsername) {
  const response = await apiClient.get(`tags/all/${organizationId}/`, {
    params: { username: actorUsername },
  });
  return response.data;
}

export async function updateMemberPermissions(
  organizationId,
  memberUsername,
  adminUsername,
  tags
) {
  const response = await apiClient.put(
    `members/update-permissions/${organizationId}/${encodeURIComponent(
      memberUsername
    )}/`,
    {
      admin_username: adminUsername,
      tags: tags,
    }
  );
  return response.data;
}
