import apiClient from "./client";

function toFormData(payload) {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry === undefined || entry === null) {
          return;
        }
        params.append(key, String(entry));
      });
      return;
    }
    params.append(key, String(value));
  });
  return params;
}

// Get board with full content (columns + tasks)
export async function getBoardWithContent(organizationId, projectId, username) {
  if (!organizationId || !projectId || !username) {
    throw new Error("organizationId, projectId and username are required");
  }

  const response = await apiClient.get(
    `kanban/board/full/${organizationId}/${projectId}/`,
    { params: { username } }
  );
  return response.data;
}

// Get basic board info
export async function getBoard(organizationId, projectId, username) {
  if (!organizationId || !projectId || !username) {
    throw new Error("organizationId, projectId and username are required");
  }

  const response = await apiClient.get(
    `kanban/board/basic/${organizationId}/${projectId}/`,
    { params: { username } }
  );
  return response.data;
}

// Add column to board
export async function createColumn(
  organizationId,
  boardId,
  username,
  title,
  position = 0
) {
  if (!organizationId || !boardId || !username || !title) {
    throw new Error("organizationId, boardId, username and title are required");
  }

  const params = toFormData({
    username,
    title,
    position,
  });

  const response = await apiClient.post(
    `kanban/column/create/${organizationId}/${boardId}/`,
    params
  );
  return response.data;
}

// Update column position
export async function updateColumnPosition(
  organizationId,
  boardId,
  columnId,
  username,
  position
) {
  if (
    !organizationId ||
    !boardId ||
    !columnId ||
    !username ||
    position === undefined
  ) {
    throw new Error(
      "organizationId, boardId, columnId, username and position are required"
    );
  }

  const response = await apiClient.put(
    `kanban/column/move/${organizationId}/${boardId}/${columnId}/`,
    { username, position }
  );
  return response.data;
}

// Update column (title and/or position)
export async function updateColumn(
  organizationId,
  boardId,
  columnId,
  username,
  updates
) {
  if (!organizationId || !boardId || !columnId || !username) {
    throw new Error(
      "organizationId, boardId, columnId and username are required"
    );
  }

  const response = await apiClient.put(
    `kanban/column/move/${organizationId}/${boardId}/${columnId}/`,
    { username, ...updates }
  );
  return response.data;
}

// Delete column
export async function deleteColumn(organizationId, boardId, columnId) {
  if (!organizationId || !boardId || !columnId) {
    throw new Error("organizationId, boardId, and columnId are required");
  }

  const response = await apiClient.delete(
    `kanban/column/delete/${organizationId}/${boardId}/${columnId}/`
  );
  return response.data;
}

// Create task
export async function createTask(
  organizationId,
  boardId,
  columnId,
  username,
  taskData
) {
  if (!organizationId || !boardId || !columnId || !username) {
    throw new Error(
      "organizationId, boardId, columnId and username are required"
    );
  }

  const params = toFormData({
    username,
    title: taskData.title,
    description: taskData.description || "",
    position: taskData.position || 0,
    due_date: taskData.due_date || null,
    assigned_to_id: taskData.assigned_to_id || null,
    status: taskData.status || "todo",
  });

  const response = await apiClient.post(
    `kanban/task/create/${organizationId}/${boardId}/${columnId}/`,
    params
  );
  return response.data;
}

// Update task
export async function updateTask(
  organizationId,
  boardId,
  columnId,
  taskId,
  username,
  taskData
) {
  if (!organizationId || !boardId || !columnId || !taskId || !username) {
    throw new Error(
      "organizationId, boardId, columnId, taskId and username are required"
    );
  }

  const response = await apiClient.put(
    `kanban/task/update/${organizationId}/${boardId}/${columnId}/${taskId}/`,
    {
      username,
      ...taskData,
    }
  );
  return response.data;
}

// Delete task
export async function deleteTask(
  organizationId,
  boardId,
  columnId,
  taskId,
  username
) {
  if (!organizationId || !boardId || !columnId || !taskId || !username) {
    throw new Error(
      "organizationId, boardId, columnId, taskId and username are required"
    );
  }

  const response = await apiClient.delete(
    `kanban/task/delete/${organizationId}/${boardId}/${columnId}/${taskId}/`,
    { data: { username } }
  );
  return response.data;
}
