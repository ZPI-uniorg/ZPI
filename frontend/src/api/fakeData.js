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
  "Projekt1", "Projekt2", "Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6", "Tag7", "Tag8", "Tag9", "Tag10", "Tag11"
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
    tags: ["Projekt1"],
  },
  {
    id: 2,
    title: "Warsztaty AI",
    date: "2025-11-12",
    tags: ["Tag1"],
  },
  {
    id: 3,
    title: "Demo day",
    date: "2025-11-15",
    tags: ["Projekt2", "Tag1"],
  },
  {
    id: 4,
    title: "Planowanie sprintu",
    date: "2025-11-18",
    tags: ["Projekt1", "Projekt2"],
  },
];
