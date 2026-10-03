export const demoDonations = [
  {
    id: "don-1",
    donorName: "अक्षय पाटील",
    mobile: "9876543210",
    email: "akshay@example.com",
    amount: 501,
    paymentMode: "UPI",
    purpose: "गणेशोत्सव",
    date: "2026-09-01",
    transactionId: "UPI-501",
    status: "Paid",
  },
  {
    id: "don-2",
    donorName: "मेधा कोरपले",
    mobile: "9123456780",
    email: "megha@example.com",
    amount: 1001,
    paymentMode: "Cash",
    purpose: "महालक्ष्मी प्रसाद",
    date: "2026-09-05",
    transactionId: "CASH-1001",
    status: "Paid",
  },
  {
    id: "don-3",
    donorName: "सौरभ जाधव",
    mobile: "9988776655",
    email: "saurabh@example.com",
    amount: 2001,
    paymentMode: "Bank",
    purpose: "समिती खर्च",
    date: "2026-09-10",
    transactionId: "BANK-2001",
    status: "Pending",
  },
];

export const demoExpenses = [
  {
    id: "exp-1",
    title: "Decorations",
    category: "Decoration",
    amount: 4500,
    date: "2026-09-12",
    paymentMode: "Cash",
    description: "Flower and tent decoration",
  },
  {
    id: "exp-2",
    title: "Sound System",
    category: "Sound System",
    amount: 6800,
    date: "2026-09-15",
    paymentMode: "Bank",
    description: "DJ and speaker setup",
  },
  {
    id: "exp-3",
    title: "Lighting",
    category: "Lighting",
    amount: 3200,
    date: "2026-09-18",
    paymentMode: "UPI",
    description: "LED lighting arrangement",
  },
];

export const demoDevotees = [
  {
    id: "dev-1",
    name: "राजेश नाइक",
    mobile: "9090909090",
    email: "rajesh@example.com",
    address: "Kaneri",
    totalDonation: 2500,
  },
  {
    id: "dev-2",
    name: "प्रीती देशमुख",
    mobile: "9191919191",
    email: "preeti@example.com",
    address: "Kolhapur",
    totalDonation: 5000,
  },
  {
    id: "dev-3",
    name: "विजय मोरे",
    mobile: "9292929292",
    email: "vijay@example.com",
    address: "Kaneri Phata",
    totalDonation: 1500,
  },
];

export const demoEvents = [
  {
    id: "evt-1",
    name: "Ganesh Sthapana",
    date: "2026-09-25",
    time: "08:00",
    location: "Kaneri Ground",
    description: "Festival inauguration",
    image: "",
    organizer: "Mandal Committee",
  },
  {
    id: "evt-2",
    name: "Aarti",
    date: "2026-09-26",
    time: "18:30",
    location: "Mandal Hall",
    description: "Evening aarti",
    image: "",
    organizer: "Temple Team",
  },
  {
    id: "evt-3",
    name: "Mahaprasad",
    date: "2026-09-27",
    time: "12:00",
    location: "Community Hall",
    description: "Community meal",
    image: "",
    organizer: "Volunteer Team",
  },
  {
    id: "evt-4",
    name: "Visarjan",
    date: "2026-10-02",
    time: "17:00",
    location: "Riverbank",
    description: "Immersion procession",
    image: "",
    organizer: "Mandal Committee",
  },
];

export const demoMembers = [
  {
    id: "mem-1",
    name: "Omkar Mandal",
    position: "President",
    mobile: "8888888888",
    email: "president@mandal.com",
    photo: "",
  },
  {
    id: "mem-2",
    name: "Rohit Patil",
    position: "Secretary",
    mobile: "7777777777",
    email: "secretary@mandal.com",
    photo: "",
  },
  {
    id: "mem-3",
    name: "Sneha Kulkarni",
    position: "Treasurer",
    mobile: "6666666666",
    email: "treasurer@mandal.com",
    photo: "",
  },
];

export const demoSponsors = [
  {
    id: "sp-1",
    sponsorName: "Kiran Industries",
    mobile: "9800000001",
    businessName: "Kiran Industries",
    amount: 10000,
    sponsorType: "Main Sponsor",
    date: "2026-08-15",
    notes: "Festival sponsorship",
  },
  {
    id: "sp-2",
    sponsorName: "Swaraj Foods",
    mobile: "9800000002",
    businessName: "Swaraj Foods",
    amount: 5000,
    sponsorType: "Food Sponsor",
    date: "2026-08-20",
    notes: "Prasad support",
  },
];

export const demoReceipts = [
  {
    id: "rc-1",
    donorName: "ಅಕ್ಷಯ",
    year: 2026,
    receiptNumber: "RC-1001",
    amount: 501,
    paymentMode: "UPI",
    date: "2026-09-01",
    purpose: "Ganesh Utsav",
    status: "PAID",
  },
  {
    id: "rc-2",
    donorName: "मेधा",
    year: 2026,
    receiptNumber: "RC-1002",
    amount: 1001,
    paymentMode: "Cash",
    date: "2026-09-05",
    purpose: "Mahaprasad",
    status: "PARTIAL",
  },
];

export const demoUsers = [
  {
    id: "usr-1",
    name: "Admin User",
    email: "admin@mandal.com",
    mobile: "9000000000",
    role: "Super Admin",
    status: "Active",
  },
  {
    id: "usr-2",
    name: "Treasurer",
    email: "treasurer@mandal.com",
    mobile: "9000000001",
    role: "Treasurer",
    status: "Active",
  },
];

export const demoLedger = [
  {
    id: "ld-1",
    date: "2026-09-01",
    description: "Donation received",
    income: 501,
    expense: 0,
    balance: 501,
    reference: "RC-1001",
  },
  {
    id: "ld-2",
    date: "2026-09-12",
    description: "Decoration expense",
    income: 0,
    expense: 4500,
    balance: -3999,
    reference: "EXP-1",
  },
];

export const demoRegistration = {
  mandalType: "Ganesh Mandal",
  mandalName: "ॐकार तरुण मंडळ",
  city: "Kolhapur",
  state: "Maharashtra",
};
