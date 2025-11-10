export const FAKE_MEMBERS = [
  {
    id: 1,
    username: "jan.kowalski",
    email: "jan.kowalski@uni.edu",
    role: "admin",
    first_name: "Jan",
    last_name: "Kowalski",
    tags: ["Projekt1", "Tag2"],
  },
  {
    id: 2,
    username: "anna.nowak",
    email: "anna.nowak@uni.edu",
    role: "member",
    first_name: "Anna",
    last_name: "Nowak",
    tags: ["Tag1", "Tag3", "Projekt2"],
  },
  {
    id: 3,
    username: "piotr.zielinski",
    email: "piotr.zielinski@uni.edu",
    role: "coordinator",
    first_name: "Piotr",
    last_name: "Zieliński",
    tags: ["Tag4"],
  },
];

export const TAGS = [
  "Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6", "Tag7", "Tag8", "Tag9", "Tag10", "Tag11"
];

export const PROJECTS = [
  { id: "p1", name: "Projekt1" },
  { id: "p2", name: "Projekt2" },
];

export const CHATS = [
  { id: "c1", title: "Chat1", tags: ["Projekt1"] },
  { id: "c2", title: "Chat2", tags: ["Projekt2"] },
  { id: "c3", title: "Chat3", tags: ["Tag1", "Projekt1"] },
];

export const EVENTS = [
  {
    id: 1,
    title: "Spotkanie projektowe",
    date: "2025-11-10",
    start_time: "10:00",
    end_time: "11:00",
    tags: ["Projekt1"],
  },
  {
    id: 2,
    title: "Warsztaty AI",
    date: "2025-11-12", 
    start_time: "12:00",
    end_time: "16:00",
    tags: ["Tag1"],
  },
  {
    id: 3,
    title: "Demo day",
    date: "2025-11-15",
    start_time: "11:00",
    end_time: "12:30",
    tags: ["Projekt2", "Tag1"],
  },
  {
    id: 4,
    title: "Planowanie sprintu",
    date: "2025-11-18",
    start_time: "09:00",
    end_time: "09:45",
    tags: ["Projekt1", "Projekt2"],
  },
  {
    id: 5,
    title: "Planowanie truchtu",
    date: "2025-11-18",
    start_time: "15:30",
    end_time: "16:30",
    tags: ["Projekt1", "Projekt2"],
  },
];

// Pomocnicze funkcje do zarządzania tagami członków
export function getMemberTags(memberId) {
  const member = FAKE_MEMBERS.find(m => m.id === memberId);
  return member?.tags || [];
}

export function getTagMembers(tagName) {
  return FAKE_MEMBERS.filter(m => m.tags?.includes(tagName));
}

export function addTagToMember(memberId, tagName) {
  const member = FAKE_MEMBERS.find(m => m.id === memberId);
  if (member && !member.tags?.includes(tagName)) {
    if (!member.tags) member.tags = [];
    member.tags.push(tagName);
  }
}

export function removeTagFromMember(memberId, tagName) {
  const member = FAKE_MEMBERS.find(m => m.id === memberId);
  if (member?.tags) {
    member.tags = member.tags.filter(t => t !== tagName);
  }
}

export function setTagMembers(tagName, memberIds) {
  // Usuń tag ze wszystkich członków
  FAKE_MEMBERS.forEach(m => {
    if (m.tags) {
      m.tags = m.tags.filter(t => t !== tagName);
    }
  });
  // Dodaj tag do wybranych członków
  memberIds.forEach(id => {
    addTagToMember(id, tagName);
  });
}

export function renameTag(oldName, newName) {
  FAKE_MEMBERS.forEach(m => {
    if (m.tags?.includes(oldName)) {
      const idx = m.tags.indexOf(oldName);
      m.tags[idx] = newName;
    }
  });
  const tagIdx = TAGS.indexOf(oldName);
  if (tagIdx !== -1) {
    TAGS[tagIdx] = newName;
  }
}

export function deleteTag(tagName) {
  FAKE_MEMBERS.forEach(m => {
    if (m.tags) {
      m.tags = m.tags.filter(t => t !== tagName);
    }
  });
  const idx = TAGS.indexOf(tagName);
  if (idx !== -1) {
    TAGS.splice(idx, 1);
  }
}
