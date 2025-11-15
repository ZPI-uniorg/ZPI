export const FAKE_MEMBERS = [];

export const TAGS = [];

export const PROJECTS = [];

export const CHATS = [];

export const EVENTS = [];

export const KANBAN_BOARDS = {};

// Pomocnicze funkcje do zarządzania tagami członków – na razie operują na lokalnym stanie w pamięci
export function getMemberTags(memberId) {
  const member = FAKE_MEMBERS.find((m) => m.id === memberId);
  return member?.tags || [];
}

export function getTagMembers(tagName) {
  return FAKE_MEMBERS.filter((m) => m.tags?.includes(tagName));
}

export function addTagToMember(memberId, tagName) {
  const member = FAKE_MEMBERS.find((m) => m.id === memberId);
  if (!member) return;
  if (!member.tags) {
    member.tags = [];
  }
  if (!member.tags.includes(tagName)) {
    member.tags.push(tagName);
  }
}

export function removeTagFromMember(memberId, tagName) {
  const member = FAKE_MEMBERS.find((m) => m.id === memberId);
  if (member?.tags) {
    member.tags = member.tags.filter((t) => t !== tagName);
  }
}

export function setTagMembers(tagName, memberIds) {
  FAKE_MEMBERS.forEach((member) => {
    if (member.tags) {
      member.tags = member.tags.filter((tag) => tag !== tagName);
    }
  });

  memberIds.forEach((id) => {
    addTagToMember(id, tagName);
  });
}

export function renameTag(oldName, newName) {
  FAKE_MEMBERS.forEach((member) => {
    if (member.tags?.includes(oldName)) {
      const idx = member.tags.indexOf(oldName);
      member.tags[idx] = newName;
    }
  });

  const tagIdx = TAGS.indexOf(oldName);
  if (tagIdx !== -1) {
    TAGS[tagIdx] = newName;
  }
}

export function deleteTag(tagName) {
  FAKE_MEMBERS.forEach((member) => {
    if (member.tags) {
      member.tags = member.tags.filter((tag) => tag !== tagName);
    }
  });

  const idx = TAGS.indexOf(tagName);
  if (idx !== -1) {
    TAGS.splice(idx, 1);
  }
}
