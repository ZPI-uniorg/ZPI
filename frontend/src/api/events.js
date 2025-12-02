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

function buildDateTime(date, time, isAllDay = false, isEndTime = false) {
  if (!date) return "";
  if (isAllDay || !time) {
    // For all-day events, use 00:00:00 for start and 23:59:59 for end
    return isEndTime ? `${date} 23:59:59` : `${date} 00:00:00`;
  }
  return `${date} ${time}:00`;
}

function buildPermissionsString(combinations = [], tags = []) {
  const parts = [];
  if (Array.isArray(combinations) && combinations.length > 0) {
    parts.push(
      ...combinations
        .map((combo) => (Array.isArray(combo) ? combo : [combo]))
        .map((arr) => arr.map((x) => String(x).trim()))
        .map((arr) => arr.filter(Boolean).join("+"))
        .filter((s) => s.length > 0)
    );
  }
  if (Array.isArray(tags) && tags.length > 0) {
    parts.push(...tags.map((t) => String(t).trim()).filter(Boolean));
  }
  return parts.join(",");
}

export async function createEvent(organizationId, actorUsername, payload) {
  const isAllDay = !payload.start_time && !payload.end_time;
  const params = new URLSearchParams();
  params.append("username", actorUsername);
  params.append("name", payload.name || payload.title || "");
  params.append("description", payload.description || "");
  params.append("start_time", buildDateTime(payload.date, payload.start_time, isAllDay, false));
  params.append(
    "end_time",
    buildDateTime(payload.endDate || payload.date, payload.end_time, isAllDay, true)
  );
  params.append(
    "permissions",
    buildPermissionsString(payload.combinations || [], payload.tags || [])
  );
  const response = await apiClient.post(
    `events/create/${organizationId}/`,
    params
  );
  return response.data;
}

export async function updateEvent(
  organizationId,
  eventId,
  actorUsername,
  payload
) {
  const isAllDay = !payload.start_time && !payload.end_time;
  const response = await apiClient.put(
    `events/update/${organizationId}/${eventId}/`,
    {
      username: actorUsername,
      name: payload.name || payload.title || "",
      description: payload.description || "",
      start_time: buildDateTime(payload.date, payload.start_time, isAllDay, false),
      end_time: buildDateTime(
        payload.endDate || payload.date,
        payload.end_time,
        isAllDay,
        true
      ),
      permissions: buildPermissionsString(
        payload.combinations || [],
        payload.tags || []
      ),
    },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
}

export async function deleteEvent(organizationId, eventId, actorUsername) {
  await apiClient.delete(`events/delete/${organizationId}/${eventId}/`, {
    headers: { "Content-Type": "application/json" },
    data: { username: actorUsername },
  });
}

export async function getAllEvents(organizationId, actorUsername, startDate = null, endDate = null) {
  const params = { username: actorUsername };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await apiClient.get(`events/all/${organizationId}/`, { params });
  return response.data;
}

export async function getUserEvents(organizationId, actorUsername, startDate = null, endDate = null) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const response = await apiClient.get(`events/my/${organizationId}/${actorUsername}/`, { params });
  return response.data;
}
