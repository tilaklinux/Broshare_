// Mock data for demo mode (when backend is not running)
// This allows the app to be fully functional for demonstration

const DEMO_USERS = [
  {
    id: 1,
    name: "Arjun Mehta",
    email: "arjun@demo.com",
    hostel_name: "Tagore Hostel",
    room_number: "204",
  },
  {
    id: 2,
    name: "Priya Sharma",
    email: "priya@demo.com",
    hostel_name: "Vivekananda Hostel",
    room_number: "112",
  },
  {
    id: 3,
    name: "Rahul Kumar",
    email: "rahul@demo.com",
    hostel_name: "Raman Hostel",
    room_number: "305",
  },
  {
    id: 4,
    name: "Sneha Patel",
    email: "sneha@demo.com",
    hostel_name: "Tagore Hostel",
    room_number: "108",
  },
];

const DEMO_ITEMS = [
  {
    id: 1,
    user_id: 1,
    title: "Engineering Mathematics Textbook",
    description:
      "B.S. Grewal Higher Engineering Mathematics. Used for one semester, good condition. Some highlights inside.",
    category: "Books",
    looking_for: "Data Structures textbook or ₹200",
    image_url: "",
    status: "available",
    created_at: "2025-01-10T10:00:00Z",
    user_name: "Arjun Mehta",
    hostel_name: "Tagore Hostel",
    room_number: "204",
  },
  {
    id: 2,
    user_id: 2,
    title: "USB-C Hub (Multiport Adapter)",
    description:
      "7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader. Barely used, works perfectly.",
    category: "Electronics",
    looking_for: "Wireless mouse or keyboard",
    image_url: "",
    status: "available",
    created_at: "2025-01-12T14:30:00Z",
    user_name: "Priya Sharma",
    hostel_name: "Vivekananda Hostel",
    room_number: "112",
  },
  {
    id: 3,
    user_id: 3,
    title: "Study Lamp (LED)",
    description:
      "Portable LED study lamp with 3 brightness levels. USB powered. Free to share!",
    category: "Essentials",
    looking_for: "Free/Share",
    image_url: "",
    status: "available",
    created_at: "2025-01-14T09:15:00Z",
    user_name: "Rahul Kumar",
    hostel_name: "Raman Hostel",
    room_number: "305",
  },
  {
    id: 4,
    user_id: 4,
    title: "Cricket Bat (SG)",
    description:
      "SG English Willow cricket bat. Used for 2 seasons. Minor edge marks but plays great.",
    category: "Other",
    looking_for: "Badminton racket or football",
    image_url: "",
    status: "available",
    created_at: "2025-01-15T16:45:00Z",
    user_name: "Sneha Patel",
    hostel_name: "Tagore Hostel",
    room_number: "108",
  },
  {
    id: 5,
    user_id: 1,
    title: "Phone Charger (Type-C, 33W)",
    description:
      "Fast charger with cable. Original OnePlus charger. Works with any Type-C phone.",
    category: "Electronics",
    looking_for: "Earphones or earbuds",
    image_url: "",
    status: "available",
    created_at: "2025-01-16T11:00:00Z",
    user_name: "Arjun Mehta",
    hostel_name: "Tagore Hostel",
    room_number: "204",
  },
  {
    id: 6,
    user_id: 2,
    title: "Organic Chemistry Notes (Handwritten)",
    description:
      "Complete handwritten notes for Organic Chemistry semester course. 120+ pages, well organized.",
    category: "Books",
    looking_for: "Physics notes or ₹100",
    image_url: "",
    status: "available",
    created_at: "2025-01-17T08:20:00Z",
    user_name: "Priya Sharma",
    hostel_name: "Vivekananda Hostel",
    room_number: "112",
  },
];

const DEMO_MESSAGES = [
  {
    id: 1,
    sender_id: 2,
    receiver_id: 1,
    item_id: 1,
    content: "Hi! Is the Engineering Math book still available?",
    created_at: "2025-01-17T10:00:00Z",
  },
  {
    id: 2,
    sender_id: 1,
    receiver_id: 2,
    item_id: 1,
    content: "Yes it is! Are you interested?",
    created_at: "2025-01-17T10:05:00Z",
  },
  {
    id: 3,
    sender_id: 2,
    receiver_id: 1,
    item_id: 1,
    content: "I have a Data Structures book by Tanenbaum. Want to exchange?",
    created_at: "2025-01-17T10:10:00Z",
  },
];

// Mock API functions that use localStorage
export function getMockItems() {
  const stored = localStorage.getItem("hostelbarter_items");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("hostelbarter_items", JSON.stringify(DEMO_ITEMS));
  return DEMO_ITEMS;
}

export function saveMockItems(items) {
  localStorage.setItem("hostelbarter_items", JSON.stringify(items));
}

export function getMockMessages() {
  const stored = localStorage.getItem("hostelbarter_messages");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("hostelbarter_messages", JSON.stringify(DEMO_MESSAGES));
  return DEMO_MESSAGES;
}

export function saveMockMessages(messages) {
  localStorage.setItem("hostelbarter_messages", JSON.stringify(messages));
}

export function getMockUsers() {
  return DEMO_USERS;
}

export function getDemoUser(id) {
  return DEMO_USERS.find((u) => u.id === id);
}

export const CATEGORIES = [
  "Books",
  "Electronics",
  "Accessories",
  "Essentials",
  "Other",
];
