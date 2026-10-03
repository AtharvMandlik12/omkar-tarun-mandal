import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Gift,
  HandCoins,
  Home,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MoonStar,
  Newspaper,
  Package,
  Palette,
  Phone,
  Printer,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  SunMedium,
  Ticket,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  X,
  Building2,
  BadgeCheck,
  CalendarRange,
  FileText,
  Gavel,
  Handshake,
  LandmarkIcon,
  Megaphone,
  Plus,
  BanknoteArrowUp,
  BadgeDollarSign,
  HeartHandshake,
  Siren,
  ChevronLeft,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  Link,
  useLocation,
  useParams,
} from "react-router-dom";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { getDonations, addDonation } from "./services/donationService";
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
} from "./services/expenseService";
import {
  getDevotees,
  addDevotee,
  updateDevotee,
} from "./services/devoteeService";
import { getEvents } from "./services/eventService";
import { getMembers } from "./services/memberService";
import { getSponsors } from "./services/sponsorService";
import {
  getReceipts,
  addReceipt,
  updateReceipt,
  deleteReceipt,
} from "./services/receiptService";
import { getUsers } from "./services/userService";
import { getLedger } from "./services/ledgerService";
import {
  buildAdminProfilePayload,
  getSessionUser,
  login,
  logout,
} from "./services/authService";
import { supabase } from "./lib/supabase";
import { getAdmins, addAdmin, updateAdmin } from "./services/adminService";
import { getIncome, addIncome, updateIncome } from "./services/incomeService";
import {
  getBookings,
  addBooking,
  updateBooking,
} from "./services/bookingService";
import {
  getGalleryImages,
  uploadGalleryImage,
  deleteGalleryImage,
  updateGalleryImage,
} from "./services/galleryService";
import { readStorage, writeStorage, seedStorage } from "./utils/storage";
import {
  generateReceiptNumber,
  isValidIndianMobile,
  normalizeIndianMobile,
  toWords,
} from "./utils/receiptUtils";
import {
  demoDonations,
  demoEvents,
  demoExpenses,
  demoDevotees,
  demoMembers,
  demoSponsors,
  demoUsers,
} from "./data/demoData";
import { siteConfig } from "./config/siteConfig";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const normalizeAdminDisplayName = (email = "") => {
  const base = String(email || "").split("@")[0] || "Admin";
  return (
    base
      .split(/[._-]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ") || "Admin"
  );
};

const ensureAdminRecordForSessionUser = async (sessionUser) => {
  if (!supabase || !sessionUser?.email) return null;

  const normalizedEmail = String(sessionUser.email).trim().toLowerCase();

  const { data: adminRecord, error: lookupError } = await supabase
    .from("admins")
    .select("id, email, name, role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message || "Unable to verify admin access.");
  }

  if (adminRecord) {
    return adminRecord;
  }

  const payload = buildAdminProfilePayload({
    email: normalizedEmail,
    user_metadata: { full_name: sessionUser.name || "" },
  });

  const { data: createdAdmin, error: insertError } = await supabase
    .from("admins")
    .insert([payload])
    .select("id, email, name, role")
    .single();

  if (insertError) {
    console.error("Unable to create admin profile:", insertError);
    return null;
  }

  return createdAdmin;
};

const getCurrentAdminProfile = async () => {
  if (!supabase) {
    return { name: "Admin", email: "", role: "Administrator" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { name: "Admin", email: "", role: "Administrator" };
  }

  const email = user.email || "";
  const { data: adminRow } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  return {
    id: adminRow?.id || null,
    name:
      adminRow?.name ||
      user.user_metadata?.full_name ||
      normalizeAdminDisplayName(email),
    email,
    role: adminRow?.role || "Administrator",
  };
};

const publicLinks = [
  { label: "Home", path: "/", icon: Home },
  { label: "About", path: "/about", icon: Users },
  { label: "Gallery", path: "/gallery", icon: Camera },
  { label: "Login", path: "/login", icon: UserCog },
];

const adminNavItems = [
  { label: "Admin", path: "/admin", icon: LayoutDashboard },
  { label: "Income", path: "/admin/income", icon: CircleDollarSign },
  { label: "Receipts", path: "/admin/receipts", icon: ReceiptText },
  { label: "New Receipt", path: "/admin/receipts/new", icon: Plus },
  { label: "Expenses", path: "/admin/expenses", icon: Wallet },
  { label: "Booking", path: "/admin/bookings", icon: Ticket },
];

const paymentModes = ["Cash", "UPI", "Cheque", "Bank", "NEFT", "IMPS"];
const expenseCategories = [
  "Decoration",
  "Sound System",
  "Lighting",
  "Prasad",
  "Cultural Program",
  "Advertisement",
  "Cleaning",
  "Transportation",
  "Other",
];
const sponsorTypes = [
  "Main Sponsor",
  "Co-Sponsor",
  "Event Sponsor",
  "Food Sponsor",
  "Decoration Sponsor",
];
const membershipTypes = [
  "Volunteer",
  "Member",
  "Senior Member",
  "Committee Member",
];
const userRoles = [
  "Super Admin",
  "Admin",
  "Treasurer",
  "Committee Member",
  "Volunteer",
];

const receiptDonationTypes = [
  "General Donation",
  "Festival Donation",
  "Mahaprasad Donation",
  "Decoration Donation",
  "Cultural Program Donation",
  "Social Activity Donation",
  "Other",
];

const receiptStatusOptions = ["Received", "Partial", "Pending"];

const getReceiptSettings = () =>
  readStorage("mandal_receipt_settings", {
    prefix: "OM",
    startingNumber: 1,
    numberLength: 4,
  });

const updateReceiptSettings = (settings) => {
  const nextSettings = {
    prefix: settings.prefix || "OM",
    startingNumber: Number(settings.startingNumber || 1),
    numberLength: Number(settings.numberLength || 4),
  };
  writeStorage("mandal_receipt_settings", nextSettings);
  return nextSettings;
};

const generateYearReceiptNumber = (usedNumbers = []) => {
  const year = new Date().getFullYear();
  const currentYearNumbers = (Array.isArray(usedNumbers) ? usedNumbers : [])
    .map((value) => String(value).match(/-(\d{4})-?(\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match[2]))
    .filter((num) => Number.isFinite(num));

  const existingMax = currentYearNumbers.length
    ? Math.max(...currentYearNumbers)
    : 0;
  const nextNumber = Math.max(1, existingMax + 1);
  return `OM-${year}-${String(nextNumber).padStart(4, "0")}`;
};

const getReceiptNumberNext = () => {
  const settings = getReceiptSettings();
  const existing = getReceipts().map((receipt) => receipt.receiptNumber || "");
  const usedNumbers = existing
    .map((value) => Number(String(value).split("-").at(-1)))
    .filter((num) => Number.isFinite(num));

  let nextCandidate = Number(settings.startingNumber || 1);
  while (usedNumbers.includes(nextCandidate)) {
    nextCandidate += 1;
  }

  return generateReceiptNumber(
    settings.prefix || "OM",
    nextCandidate,
    settings.numberLength || 4,
    usedNumbers,
  );
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatReceiptDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatReceiptTime = (value) => {
  if (!value) return "";
  const time = new Date(`2000-01-01T${value}`);
  if (Number.isNaN(time.getTime())) return value;
  return time.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const normalizeMobile = (value = "") => normalizeIndianMobile(value);

const buildReceiptText = (receipt, language = "en") => {
  const translations = {
    en: {
      title: "DONATION RECEIPT",
      donor: "Donor Name",
      mobile: "Mobile Number",
      payment: "Payment Method",
      received: "Received",
      amount: "Donation Amount",
      thankYou: "Thank You",
      program: "Program",
      receipt: "Receipt No",
    },
    mr: {
      title: "देणगी पावती",
      donor: "देणगीदाराचे नाव",
      mobile: "मोबाईल नंबर",
      payment: "देयक पद्धत",
      received: "प्राप्त झाले",
      amount: "प्राप्त देणगी रक्कम",
      thankYou: "अभिनंदन",
      program: "कार्यक्रम",
      receipt: "पावती क्र.",
    },
  };

  const labels = translations[language] || translations.en;
  return [
    "ॐकार तरुण मंडळ",
    labels.title,
    `${labels.receipt}: ${receipt.receiptNumber}`,
    `${labels.donor}: ${receipt.donorName || receipt.devoteeName || "-"}`,
    `${labels.mobile}: ${receipt.whatsappNumber || receipt.mobile || "-"}`,
    `${labels.payment}: ${receipt.paymentMode || "Cash"}`,
    `${labels.amount}: ${formatCurrency(receipt.amount || 0)}`,
    `${labels.program}: ${receipt.event || "Ganesh Festival"}`,
    `${labels.thankYou}!`,
  ].join("\n");
};

function BookOpen(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...props}
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 5.5V19" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PublicLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fffaf3] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-[#f7d7a5] bg-[#ff8a00]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/20 text-lg font-bold">
              ॐ
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.08em] uppercase">
                Mandal
              </div>
              <div className="text-base font-bold">ॐकार तरुण मंडळ</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {publicLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-white" : "text-orange-100 hover:text-white"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm"
            >
              Login
            </Link>
          </div>

          <button
            className="rounded-full border border-white/30 p-2 text-white lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/20 bg-[#ff8a00] p-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {publicLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-sm font-medium ${isActive ? "bg-white text-orange-600" : "text-white"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-xl bg-white px-3 py-2 text-center font-semibold text-orange-600"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>

      <footer className="border-t border-orange-100 bg-[#fff7e6]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="mb-3 text-xl font-black text-[#202020]">
              ॐकार तरुण मंडळ
            </div>
            <p className="text-sm text-slate-600">
              Kaneri Phata,
              <br />
              Kaneri, Kolhapur,
              <br />
              Maharashtra
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold">Instagram:</span>
              <a
                href="https://www.instagram.com/__omkar_tarun_mandal__?stkn=N2U5enNhbXhyM2tr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#202020] hover:text-[#d44720]"
              >
                <InstagramIcon size={16} />
                <span>@_omkar_tarun_mandal_</span>
              </a>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-bold text-[#202020]">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <Link to="/about">About</Link>
              <Link to="/gallery">Gallery</Link>
              <Link to="/login">Login</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-bold text-[#202020]">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    const syncUser = async () => {
      if (!supabase) {
        navigate("/login", { replace: true });
        return;
      }

      const sessionUser = await getSessionUser();
      if (!active) return;

      if (!sessionUser) {
        navigate("/login", { replace: true });
        setUser(null);
        return;
      }

      const adminRecord = await ensureAdminRecordForSessionUser(sessionUser);
      if (!adminRecord) {
        navigate("/login", { replace: true });
        setUser(null);
        return;
      }

      setUser(sessionUser);
    };

    syncUser();

    const {
      data: { subscription },
    } = supabase
      ? supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!active) return;

          if (!session) {
            setUser(null);
            navigate("/login", { replace: true });
            return;
          }

          const nextUser = await getSessionUser();
          setUser(nextUser);
        })
      : { data: { subscription: null } };

    return () => {
      active = false;
      subscription?.unsubscribe?.();
    };
  }, [location.key, navigate]);

  if (!user) {
    return null;
  }

  const handleSidebarNavigate = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-800">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-orange-100 bg-[#fff7e6] p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff8a00] text-lg font-black text-white">
            ॐ
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff8a00]">
              Mandal
            </div>
            <div className="text-lg font-black text-[#202020]">
              ॐकार तरुण मंडळ
            </div>
            <div className="text-xs text-slate-500">Kaneri, Kolhapur</div>
          </div>
        </div>

        <nav className="space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(event) => {
                  event.preventDefault();
                  handleSidebarNavigate(item.path);
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-[#ff8a00] text-white shadow-sm" : "text-slate-700 hover:bg-orange-50 hover:text-[#ff8a00]"}`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-orange-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">
                Dashboard
              </div>
              <div className="text-xl font-black text-[#202020]">
                ॐकार तरुण मंडळ
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-full border border-orange-100 bg-[#fff7e6] p-2 text-orange-600">
                <Bell size={18} />
              </button>
              <div className="hidden rounded-full bg-[#ff8a00] px-3 py-2 text-sm font-semibold text-white sm:block">
                Admin
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 pb-24 sm:p-6 lg:pb-6">
          <Routes>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/income" element={<IncomePage />} />
            <Route path="/admin/receipts/new" element={<CreateReceiptPage />} />
            <Route
              path="/admin/receipts/:receiptId"
              element={<ReceiptPreviewPage />}
            />
            <Route path="/admin/receipts" element={<ReceiptsPage />} />
            <Route path="/admin/expenses" element={<ExpensesPage />} />
            <Route path="/admin/bookings" element={<BookingsPage />} />
          </Routes>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-100 bg-white px-2 py-2 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(event) => {
                  event.preventDefault();
                  handleSidebarNavigate(item.path);
                }}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium ${isActive ? "bg-[#fff7e6] text-[#ff8a00]" : "text-slate-500"}`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function StatCard({ title, value, subtext, accent = "orange" }) {
  const accentMap = {
    orange: "bg-[#fff7e6] text-[#ff8a00]",
    cream: "bg-[#fff7e6] text-[#202020]",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-[28px] border border-orange-100 bg-white p-4 shadow-[0_8px_20px_rgba(248,140,25,0.08)]">
      <div
        className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accentMap[accent]}`}
      >
        {title}
      </div>
      <div className="text-3xl font-black text-[#202020]">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{subtext}</div>
    </div>
  );
}

function EmptyState({ title, description, icon: Icon }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[26px] border border-dashed border-orange-200 bg-[#fffaf1] p-6 text-center">
      <div className="mb-3 rounded-full bg-[#fff7e6] p-4 text-[#ff8a00]">
        <Icon size={28} />
      </div>
      <div className="text-lg font-bold text-[#202020]">{title}</div>
      <div className="mt-2 max-w-sm text-sm text-slate-500">{description}</div>
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-[#ff8a00] text-white hover:bg-[#e87500]",
    secondary: "bg-[#fff7e6] text-[#202020] hover:bg-[#ffedd0]",
    dark: "bg-[#202020] text-white hover:bg-[#111827]",
    ghost:
      "border border-orange-200 bg-white text-[#202020] hover:bg-orange-50",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function HomePage() {
  return (
    <div className="space-y-8 pb-16">
      <section className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
          About Mandal
        </div>
        <h1 className="text-4xl font-black text-[#202020]">ॐकार तरुण मंडळ</h1>
        <a
          href="https://www.instagram.com/__omkar_tarun_mandal__?stkn=N2U5enNhbXhyM2tr"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-[#202020] transition hover:bg-orange-100"
        >
          <InstagramIcon size={16} className="text-[#d44720]" />
          <span>@_omkar_tarun_mandal_</span>
        </a>
        <div className="mt-4 max-w-4xl space-y-4 text-slate-600">
          <p>
            ॐकार तरुण मंडळ हे कणेरी फाटा परिसरातील तरुणांच्या एकजुटीने आणि
            उत्साहाने स्थापन झालेले मंडळ आहे.
          </p>
          <p>मंडळाची स्थापना २००४ साली झाली.</p>
          <p>
            श्री गणरायाच्या भक्तीला सामाजिक कार्याची जोड देणे हा आमचा मुख्य
            उद्देश आहे.
          </p>
          <p>
            गणेशोत्सव हा आमच्यासाठी केवळ उत्सव नसून एकत्र येण्याचा आणि आनंद
            वाटण्याचा उत्सव आहे.
          </p>
          <p>
            मंडळातील तरुण एकजुटीने विविध धार्मिक, सामाजिक आणि सांस्कृतिक
            उपक्रमांमध्ये सहभागी होतात.
          </p>
          <p>
            उत्सवाच्या काळात सजावट, आरती, मिरवणूक आणि विविध कार्यक्रमांचे आयोजन
            केले जाते.
          </p>
          <p>
            तरुणांमध्ये एकता, शिस्त, सामाजिक जबाबदारी आणि संस्कृतीची जाणीव
            निर्माण करणे हे आमचे ध्येय आहे.
          </p>
          <p>
            आमच्या प्रत्येक उपक्रमामागे मंडळातील सदस्यांची मेहनत आणि नागरिकांचे
            सहकार्य असते.
          </p>
          <p>परंपरा जपत आधुनिक विचारांसोबत पुढे जाण्याचा आमचा प्रयत्न आहे.</p>
          <p>
            श्री गणरायाच्या आशीर्वादाने मंडळाची वाटचाल अधिक मजबूत करण्यासाठी
            आम्ही सदैव प्रयत्नशील आहोत.
          </p>
          <p>
            एकता • भक्ती • संस्कृती • सामाजिक बांधिलकी हीच आमच्या मंडळाची ओळख
            आहे.
          </p>
          <p>गणपती बाप्पा मोरया! 🚩🙏</p>
        </div>
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-[#fff7e6] p-8">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
          About Mandal
        </div>
        <h1 className="mt-3 text-4xl font-black text-[#202020]">
          ॐकार तरुण मंडळ
        </h1>
        <div className="mt-4 max-w-4xl space-y-4 text-slate-600">
          <p>
            ॐकार तरुण मंडळ हे कणेरी फाटा परिसरातील तरुणांच्या एकजुटीने आणि
            उत्साहाने स्थापन झालेले मंडळ आहे.
          </p>
          <p>मंडळाची स्थापना २००४ साली झाली.</p>
          <p>
            श्री गणरायाच्या भक्तीला सामाजिक कार्याची जोड देणे हा आमचा मुख्य
            उद्देश आहे.
          </p>
          <p>
            गणेशोत्सव हा आमच्यासाठी केवळ उत्सव नसून एकत्र येण्याचा आणि आनंद
            वाटण्याचा उत्सव आहे.
          </p>
          <p>
            मंडळातील तरुण एकजुटीने विविध धार्मिक, सामाजिक आणि सांस्कृतिक
            उपक्रमांमध्ये सहभागी होतात.
          </p>
          <p>
            उत्सवाच्या काळात सजावट, आरती, मिरवणूक आणि विविध कार्यक्रमांचे आयोजन
            केले जाते.
          </p>
          <p>
            तरुणांमध्ये एकता, शिस्त, सामाजिक जबाबदारी आणि संस्कृतीची जाणीव
            निर्माण करणे हे आमचे ध्येय आहे.
          </p>
          <p>
            आमच्या प्रत्येक उपक्रमामागे मंडळातील सदस्यांची मेहनत आणि नागरिकांचे
            सहकार्य असते.
          </p>
          <p>परंपरा जपत आधुनिक विचारांसोबत पुढे जाण्याचा आमचा प्रयत्न आहे.</p>
          <p>
            श्री गणरायाच्या आशीर्वादाने मंडळाची वाटचाल अधिक मजबूत करण्यासाठी
            आम्ही सदैव प्रयत्नशील आहोत.
          </p>
          <p>
            एकता • भक्ती • संस्कृती • सामाजिक बांधिलकी हीच आमच्या मंडळाची ओळख
            आहे.
          </p>
          <p>गणपती बाप्पा मोरया! 🚩🙏</p>
        </div>
      </section>
    </div>
  );
}

function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", caption: "" });
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const currentLightboxPhoto =
    lightboxIndex !== null && photos[lightboxIndex]
      ? photos[lightboxIndex]
      : null;

  const openLightbox = (index) => {
    if (index >= 0 && index < photos.length) {
      setLightboxIndex(index);
    }
  };

  const cycleLightbox = (direction) => {
    if (!photos.length) return;

    setLightboxIndex((currentIndex) => {
      if (currentIndex === null) {
        return direction > 0 ? 0 : photos.length - 1;
      }

      return (currentIndex + direction + photos.length) % photos.length;
    });
  };

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        cycleLightbox(1);
      }

      if (event.key === "ArrowLeft") {
        cycleLightbox(-1);
      }

      if (event.key === "Escape") {
        setLightboxIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, photos.length]);

  const loadGallery = async () => {
    try {
      const records = await getGalleryImages();
      setPhotos(records);
    } catch (galleryError) {
      setError(galleryError?.message || "Unable to load gallery photos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const syncAdminState = async () => {
      if (!supabase) {
        if (!ignore) setIsAdmin(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!ignore) setIsAdmin(Boolean(user));
    };

    syncAdminState();
    loadGallery();

    return () => {
      ignore = true;
    };
  }, []);

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    const acceptedFiles = [];
    const invalidNames = [];

    files.forEach((file) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp)$/i.test(file.name);
      const isSmallEnough = file.size <= 8 * 1024 * 1024;

      if (!isImage) {
        invalidNames.push(file.name);
        return;
      }

      if (!isSmallEnough) {
        invalidNames.push(`${file.name} (too large)`);
        return;
      }

      acceptedFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        title: "",
        caption: "",
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (invalidNames.length) {
      setError("Only JPG, JPEG, PNG, and WEBP files under 8MB are allowed.");
    } else {
      setError("");
    }

    if (acceptedFiles.length) {
      setSelectedFiles((current) => [...current, ...acceptedFiles]);
    }

    event.target.value = "";
  };

  const updateSelectedFile = (id, field, value) => {
    setSelectedFiles((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeSelectedFile = (id) => {
    setSelectedFiles((current) =>
      current.filter((item) => {
        if (item.id !== id) return true;
        if (item.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return false;
      }),
    );
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !supabase) {
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const baseDisplayOrder =
        Math.max(0, ...photos.map((item) => Number(item.display_order) || 0)) +
        1;

      const uploadedRecords = [];
      for (const [index, item] of selectedFiles.entries()) {
        const record = await uploadGalleryImage(item.file, {
          title: item.title.trim() || item.file.name.replace(/\.[^.]+$/, ""),
          caption: item.caption.trim(),
          uploaded_by: user?.email || null,
          userId: user?.id || "admin",
          display_order: baseDisplayOrder + index,
        });
        uploadedRecords.push(record);
      }

      setPhotos((current) => [...uploadedRecords, ...current]);
      setSelectedFiles([]);
    } catch (uploadError) {
      setError(uploadError?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      await deleteGalleryImage(photo);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));

      if (lightboxIndex !== null && currentLightboxPhoto?.id === photo.id) {
        setLightboxIndex(null);
      }

      setError("");
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete the photo.");
    }
  };

  const handleEditOpen = (photo) => {
    setEditingPhoto(photo);
    setEditForm({
      title: photo.title || "",
      caption: photo.caption || photo.description || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingPhoto) return;

    try {
      const updatedPhoto = await updateGalleryImage(editingPhoto.id, {
        title: editForm.title.trim(),
        caption: editForm.caption.trim(),
      });

      setPhotos((current) =>
        current.map((photo) =>
          photo.id === editingPhoto.id ? { ...photo, ...updatedPhoto } : photo,
        ),
      );
      setEditingPhoto(null);
      setEditForm({ title: "", caption: "" });
      setError("");
    } catch (saveError) {
      setError(saveError?.message || "Unable to update the photo.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-black text-[#202020]">Gallery</h1>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white"
            >
              Add Photos
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="rounded-[30px] border border-orange-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-[#202020]">
              Selected Photos
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                className="rounded-full border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-[#202020]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="rounded-full bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUploading ? "Uploading..." : "Upload Photos"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[24px] border border-orange-100 bg-[#fffaf3]"
              >
                <div className="relative">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-52 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(item.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-[#202020] shadow-sm"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3 p-3">
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateSelectedFile(item.id, "title", event.target.value)
                    }
                    placeholder="Photo title (optional)"
                    className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm outline-none"
                  />
                  <textarea
                    value={item.caption}
                    onChange={(event) =>
                      updateSelectedFile(item.id, "caption", event.target.value)
                    }
                    placeholder="Caption (optional)"
                    className="min-h-[72px] w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[30px] bg-white p-6 text-center text-sm font-medium text-slate-600 shadow-sm">
          Loading gallery...
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-[30px] border border-dashed border-orange-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          No photos available yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => openLightbox(index)}
                className="block w-full text-left"
              >
                <img
                  src={photo.image_url}
                  alt={photo.title || "Mandal photo"}
                  className="h-68 w-full object-cover transition duration-200 hover:scale-[1.02]"
                />
              </button>

              <div className="space-y-2 p-4">
                {photo.title && (
                  <div className="text-lg font-black text-[#202020]">
                    {photo.title}
                  </div>
                )}
                {(photo.caption || photo.description) && (
                  <div className="text-sm text-slate-600">
                    {photo.caption || photo.description}
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      title="Edit photo"
                      onClick={() => handleEditOpen(photo)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 bg-[#fff7e6] text-[#202020] transition hover:bg-[#ffedd0]"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      title="Delete photo"
                      onClick={() => handleDelete(photo)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {currentLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative w-full max-w-5xl rounded-[30px] bg-[#f9fafb] p-3 shadow-2xl sm:p-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightboxIndex(null);
              }}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#202020] shadow-sm"
              aria-label="Close gallery viewer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-3 text-sm font-semibold text-slate-700 sm:px-4">
              <span>
                {lightboxIndex + 1} / {photos.length}
              </span>
              <span>{currentLightboxPhoto.title || "Gallery photo"}</span>
            </div>

            <div className="relative flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cycleLightbox(-1);
                }}
                className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#202020] shadow-lg sm:left-4"
                aria-label="Previous photo"
              >
                <ChevronLeft size={20} />
              </button>

              <img
                src={currentLightboxPhoto.image_url}
                alt={currentLightboxPhoto.title || "Gallery preview"}
                className="max-h-[76vh] w-full rounded-[20px] object-contain"
                onClick={(event) => event.stopPropagation()}
              />

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cycleLightbox(1);
                }}
                className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#202020] shadow-lg sm:right-4"
                aria-label="Next photo"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {(currentLightboxPhoto.caption ||
              currentLightboxPhoto.description) && (
              <div className="px-2 pb-2 pt-4 text-center text-sm text-slate-600 sm:px-4">
                {currentLightboxPhoto.caption ||
                  currentLightboxPhoto.description}
              </div>
            )}
          </div>
        </div>
      )}

      {editingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setEditingPhoto(null);
            setEditForm({ title: "", caption: "" });
          }}
        >
          <div
            className="w-full max-w-xl rounded-[30px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-[#202020]">Edit Photo</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingPhoto(null);
                  setEditForm({ title: "", caption: "" });
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff7e6] text-[#202020]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-3 overflow-hidden rounded-[24px] border border-orange-100 bg-[#fffaf3]">
              <img
                src={editingPhoto.image_url}
                alt={editingPhoto.title || "Edit gallery photo"}
                className="h-52 w-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#202020]">
                  Photo title
                </label>
                <input
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm outline-none"
                  placeholder="Photo title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#202020]">
                  Caption
                </label>
                <textarea
                  value={editForm.caption}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      caption: event.target.value,
                    }))
                  }
                  className="min-h-[110px] w-full rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm outline-none"
                  placeholder="Caption or description"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingPhoto(null);
                  setEditForm({ title: "", caption: "" });
                }}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[#202020]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                className="rounded-full bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="rounded-[30px] bg-white p-6 shadow-sm">
      <h1 className="text-4xl font-black text-[#202020]">Privacy & Terms</h1>
      <div className="mt-6 space-y-6 text-slate-600">
        <section>
          <h3 className="text-xl font-black text-[#202020]">
            Mandal&apos;s Role
          </h3>
          <p>
            आमचे मंडळ एक समुदाय संस्था म्हणून कार्य करते. उत्सवाचे व्यवस्थापन,
            देणग्या, स्वयंसेवक आणि कार्यक्रमाशी संबंधित संवाद ही कामे जबाबदारीने
            आणि पारदर्शक पद्धतीने व्यवस्थापित केली जातात.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-black text-[#202020]">
            Donor Information
          </h3>
          <p>
            देणगीच्या नोंदी, पावत्या, आवश्यक संवाद आणि अंतर्गत नियमांचे पालन
            करण्यासाठी आवश्यक असलेली माहितीच आम्ही संकलित करतो.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-black text-[#202020]">
            Application Processing
          </h3>
          <p>
            मंडळाचे प्रशासन, हिशोब व्यवस्थापन आणि स्वयंसेवकांच्या समन्वयासाठी
            संबंधित नोंदींची प्रक्रिया केली जाते. ही प्रक्रिया मंडळाच्या
            कार्यपद्धती आणि लागू असलेल्या कायदेशीर जबाबदाऱ्यांनुसार केली जाते.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-black text-[#202020]">Data Security</h3>
          <p>
            देणगीदार आणि सदस्यांची माहिती सुरक्षित ठेवण्यासाठी आम्ही योग्य
            प्रशासकीय, तांत्रिक आणि संघटनात्मक सुरक्षा उपाययोजना करतो.
          </p>
        </section>
      </div>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="rounded-[30px] bg-white p-6 shadow-sm">
      <h1 className="text-4xl font-black text-[#202020]">Terms of Service</h1>
      <div className="mt-6 space-y-6 text-slate-600">
        <p>
          या अ‍ॅप्लिकेशनचा वापर करून, सदस्य, देणगीदार आणि प्रशासक समुदाय, देणगी
          आणि मंडळाच्या व्यवस्थापनाशी संबंधित कामांसाठी ही सेवा जबाबदारीने
          वापरण्यास सहमत आहेत.
        </p>
        <p>
          वापरकर्त्यांनी अचूक माहिती देणे आवश्यक आहे. तसेच देणगीदारांची माहिती,
          पेमेंटशी संबंधित तपशील किंवा प्लॅटफॉर्मवरील अधिकारांचा गैरवापर करू
          नये.
        </p>
        <p>
          विश्वास, पारदर्शकता आणि कामकाजाची शिस्त कायम ठेवण्यासाठी आवश्यकतेनुसार
          धोरणांमध्ये बदल करण्याचा आणि वापरकर्त्यांचा प्रवेश व्यवस्थापित
          करण्याचा अधिकार मंडळाकडे राखीव आहे.
        </p>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [adminProfile, setAdminProfile] = useState({
    name: "Admin",
    email: "",
    role: "Administrator",
  });
  const [receipts, setReceipts] = useState([]);
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    role: "Administrator",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadDashboardData = async () => {
      try {
        const [profile, adminsData, receiptRows, incomeRows, expenseRows] =
          await Promise.all([
            getCurrentAdminProfile(),
            supabase
              ? supabase
                  .from("admins")
                  .select("*")
                  .order("created_at", { ascending: false })
              : { data: [] },
            supabase
              ? supabase
                  .from("receipts")
                  .select("*")
                  .order("created_at", { ascending: false })
              : { data: [] },
            supabase
              ? supabase
                  .from("income")
                  .select("*")
                  .order("income_date", { ascending: false })
              : { data: [] },
            supabase
              ? supabase
                  .from("expenses")
                  .select("*")
                  .order("created_at", { ascending: false })
              : { data: [] },
          ]);

        if (ignore) return;

        setAdminProfile(
          profile && profile.name
            ? profile
            : { name: "Admin", email: "", role: "Administrator" },
        );
        setAdmins(
          (adminsData?.data || []).map((admin) => ({
            id: admin.id,
            name: admin.name,
            mobile: admin.mobile_number || "",
            email: admin.email || "",
            role: admin.role || "Administrator",
          })),
        );
        setReceipts(
          (receiptRows?.data || []).map((receipt) => ({
            id: receipt.id,
            receiptNumber: receipt.receipt_number || "",
            donorName: receipt.donor_name || "",
            mobile: receipt.mobile_number || receipt.whatsapp_number || "",
            whatsappNumber: receipt.whatsapp_number || "",
            amount: Number(receipt.donation_amount || 0),
            status: receipt.payment_status || "Received",
            event: receipt.event_name || "Ganesh Festival",
            date:
              receipt.receipt_date ||
              receipt.created_at ||
              new Date().toISOString(),
          })),
        );
        setIncomeEntries(
          (incomeRows?.data || []).map((entry) => ({
            id: entry.id,
            source: entry.source || "Donation",
            amount: Number(entry.amount || 0),
            description: entry.description || "",
            incomeDate:
              entry.income_date || entry.created_at || new Date().toISOString(),
          })),
        );
        setExpenses(
          (expenseRows?.data || []).map((entry) => ({
            id: entry.id,
            title: entry.expense_name || "Expense",
            amount: Number(entry.amount || 0),
            description: entry.description || "",
            date:
              entry.expense_date ||
              entry.created_at ||
              new Date().toISOString(),
          })),
        );
      } catch (error) {
        console.error("Dashboard load error:", error);
      }
    };

    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, []);

  const totalCollection = receipts.reduce(
    (sum, item) =>
      item.status === "Received" ? sum + Number(item.amount || 0) : sum,
    0,
  );
  const dailyCollection = receipts
    .filter(
      (item) =>
        new Date(item.date).toISOString().slice(0, 10) ===
        new Date().toISOString().slice(0, 10),
    )
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingReceipts = receipts.filter(
    (item) => item.status === "Pending",
  ).length;
  const partialPayments = receipts.filter(
    (item) => item.status === "Partial",
  ).length;

  const actionItems = [
    { label: "Income", icon: IndianRupee, path: "/admin/income" },
    { label: "Receipts", icon: ReceiptText, path: "/admin/receipts" },
    { label: "New Receipt", icon: Plus, path: "/admin/receipts/new" },
    { label: "Expenses", icon: Wallet, path: "/admin/expenses" },
    { label: "Booking", icon: Ticket, path: "/admin/bookings" },
  ];

  const handleSaveAdmin = async (event) => {
    event.preventDefault();
    if (!supabase) return;

    const profile = await getCurrentAdminProfile();
    const nextPayload = {
      name: form.name || profile.name,
      email: form.email || profile.email,
      role: form.role || profile.role,
      mobile_number: form.mobile || "",
    };

    if (profile.id) {
      const { error } = await supabase
        .from("admins")
        .update({ ...nextPayload, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) console.error("Admin update error:", error);
    } else {
      const { error } = await supabase.from("admins").insert([nextPayload]);
      if (error) console.error("Admin insert error:", error);
    }

    const refreshedProfile = await getCurrentAdminProfile();
    setAdminProfile(refreshedProfile);
    setForm({ name: "", mobile: "", email: "", role: "Administrator" });
    setEditingId(null);
  };

  const handleEditAdmin = (admin) => {
    setEditingId(admin.id);
    setForm({
      name: admin.name,
      mobile: admin.mobile || "",
      email: admin.email || "",
      role: admin.role || "Administrator",
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] bg-[#fff7e6] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">
              Welcome
            </div>
            <h2 className="mt-1 text-3xl font-black text-[#202020]">
              Welcome, {adminProfile.name || "Admin"}
            </h2>
          </div>
          <div className="rounded-full bg-[#ff8a00] px-3 py-2 text-sm font-semibold text-white">
            KANERI
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Collection"
          value={formatCurrency(totalCollection)}
          subtext={`${receipts.length} Receipts Issued`}
          accent="orange"
        />
        <StatCard
          title="Daily Collection"
          value={formatCurrency(dailyCollection)}
          subtext={`${receipts.filter((item) => new Date(item.date).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length} Receipts Issued`}
          accent="cream"
        />
        <StatCard
          title="Pending Receipts"
          value={formatCurrency(0)}
          subtext={`${pendingReceipts} pending items`}
          accent="red"
        />
        <StatCard
          title="Partial Payments"
          value={formatCurrency(0)}
          subtext={`${partialPayments} partial items`}
          accent="green"
        />
      </div>

      <div className="rounded-[30px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-black text-[#202020]">Quick Actions</h3>
          <span className="text-sm text-slate-500">Management modules</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {actionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                className="rounded-[22px] border border-orange-100 bg-[#fffaf3] p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff7e6] text-[#ff8a00]">
                  <Icon size={22} />
                </div>
                <div className="text-sm font-semibold text-[#202020]">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-[30px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-2xl font-black text-[#202020]">
            Admin Information
          </h3>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({
                name: adminProfile.name || "",
                mobile: "",
                email: adminProfile.email || "",
                role: adminProfile.role || "Administrator",
              });
            }}
            className="rounded-full bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white"
          >
            Edit Admin Information
          </button>
        </div>

        <div className="mb-5 rounded-[22px] border border-orange-100 bg-[#fffaf3] p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
            Admin
          </div>
          <div className="mt-2 text-xl font-black text-[#202020]">
            {adminProfile.name || "Admin"}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {adminProfile.email || "No email available"}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {adminProfile.role || "Administrator"}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {admins.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-orange-200 bg-[#fffaf3] p-5 text-sm text-slate-600">
              No admin records available.
            </div>
          ) : (
            admins.map((admin) => (
              <div
                key={admin.id}
                className="rounded-[24px] border border-orange-100 bg-[#fffaf3] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-[#202020]">
                      {admin.name}
                    </div>
                    <div className="text-sm text-slate-500">{admin.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEditAdmin(admin)}
                    className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#202020]"
                  >
                    Edit Admin Information
                  </button>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {admin.mobile || "-"}
                </div>
                <div className="text-sm text-slate-600">
                  {admin.email || "-"}
                </div>
              </div>
            ))
          )}
        </div>

        {(editingId || form.name || form.mobile || form.email) && (
          <form
            onSubmit={handleSaveAdmin}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
              placeholder="Admin Name"
            />
            <input
              required
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
              placeholder="Mobile Number"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
              placeholder="Email Address"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            >
              {userRoles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: "", mobile: "", email: "", role: "Admin" });
                }}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[#202020]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white"
              >
                {editingId ? "Save" : "Save Admin"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-[30px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
              Notification
            </div>
            <h3 className="mt-1 text-2xl font-black text-[#202020]">
              Subscription Expiring Soon
            </h3>
          </div>
          <button className="rounded-full bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white">
            Renew
          </button>
        </div>
        <div className="mt-3 text-sm text-slate-600">7 days remaining</div>
      </div>
    </div>
  );
}

function IncomePage() {
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [form, setForm] = useState({
    source: "Donation",
    amount: "",
    description: "",
    incomeDate: new Date().toISOString().slice(0, 10),
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadIncome = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .order("income_date", { ascending: false });

      if (!ignore && !error) {
        setIncomeRecords(data || []);
      }
    };

    loadIncome();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = incomeRecords.filter((entry) =>
    `${entry.source || ""} ${entry.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from("income").insert([
      {
        source: form.source,
        amount: Number(form.amount || 0),
        description: form.description || "",
        income_date: form.incomeDate,
      },
    ]);

    if (error) {
      console.error("Income insert error:", error);
      return;
    }

    const { data } = await supabase
      .from("income")
      .select("*")
      .order("income_date", { ascending: false });
    setIncomeRecords(data || []);
    setForm({
      source: "Donation",
      amount: "",
      description: "",
      incomeDate: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-[#202020]">Income</h1>
        <div className="rounded-full bg-[#fff7e6] px-3 py-2 text-sm font-semibold text-[#ff8a00]">
          {incomeRecords.length} records
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3 rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2">
          <Search size={18} className="text-[#ff8a00]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search income"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <input
            required
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Income Source"
          />
          <input
            required
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Amount"
          />
          <input
            type="date"
            value={form.incomeDate}
            onChange={(e) => setForm({ ...form, incomeDate: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="md:col-span-2 min-h-[100px] rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Description"
          />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">+ Add Income</Button>
          </div>
        </form>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Collection"
            value={formatCurrency(
              incomeRecords.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0,
              ),
            )}
            subtext="All income records"
            accent="orange"
          />
          <StatCard
            title="Daily Collection"
            value={formatCurrency(
              incomeRecords
                .filter(
                  (item) =>
                    (item.income_date || item.incomeDate || item.created_at) ===
                    new Date().toISOString().slice(0, 10),
                )
                .reduce((sum, item) => sum + Number(item.amount || 0), 0),
            )}
            subtext="Today"
            accent="cream"
          />
          <StatCard
            title="Pending"
            value={String(0)}
            subtext="Pending receipts"
            accent="red"
          />
          <StatCard
            title="Partial"
            value={String(0)}
            subtext="Partial payments"
            accent="green"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No income records found"
            description="Add your first income record to track donation collections."
            icon={ReceiptText}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-[24px] border border-orange-100 bg-[#fffaf3] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-lg font-black text-[#202020]">
                    {entry.source || "Donation"}
                  </div>
                  <div className="text-sm text-slate-500">
                    {entry.description || "No description"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[#202020]">
                    {formatCurrency(entry.amount || 0)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.income_date || entry.created_at || ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DevoteesPage() {
  const [devotees, setDevotees] = useState(getDevotees());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    totalDonation: "",
  });

  const filtered = devotees.filter((person) =>
    `${person.name} ${person.mobile}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = [
      ...getDevotees(),
      {
        ...form,
        totalDonation: Number(form.totalDonation || 0),
        id: `dev-${Date.now()}`,
      },
    ];
    localStorage.setItem("mandal_devotees", JSON.stringify(next));
    setDevotees(next);
    setForm({
      name: "",
      mobile: "",
      email: "",
      address: "",
      totalDonation: "",
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-[#202020]">Devotees</h1>
        <Button variant="primary">+ Add Devotee</Button>
      </div>

      <div className="rounded-[30px] bg-[#ff8a00] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3 rounded-full bg-white px-3 py-2">
          <Search size={18} className="text-[#ff8a00]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search devotee..."
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No devotees found."
            description="Add devotees to track donations and community information."
            icon={Users}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((devotee) => (
              <div
                key={devotee.id}
                className="rounded-[22px] bg-white/10 p-4 text-white backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black">{devotee.name}</div>
                    <div className="text-sm text-orange-50">
                      {devotee.mobile}
                    </div>
                  </div>
                  <div className="text-right text-sm text-orange-50">
                    <div>Total Donations</div>
                    <div className="font-bold">
                      {formatCurrency(devotee.totalDonation || 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-[30px] bg-white p-5 shadow-sm md:grid-cols-2"
      >
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Devotee Name"
        />
        <input
          required
          value={form.mobile}
          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Mobile"
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Email"
        />
        <input
          value={form.totalDonation}
          onChange={(e) => setForm({ ...form, totalDonation: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Total Donations"
        />
        <input
          className="md:col-span-2 rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Save Devotee</Button>
        </div>
      </form>
    </div>
  );
}

function ReceiptsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [type, setType] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [search, setSearch] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const events = getEvents();

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      if (!supabase) {
        setAccessError("Supabase is not configured.");
        return;
      }

      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        navigate("/login", { replace: true });
        return;
      }

      const adminRecord = await ensureAdminRecordForSessionUser(sessionUser);

      if (!adminRecord && !active) {
        return;
      }

      if (!adminRecord) {
        setAccessError("Admin access required.");
        navigate("/admin", { replace: true });
        return;
      }

      if (!active) return;

      try {
        const next = await getReceipts();
        if (!active) return;
        setReceipts(next || []);
      } catch (error) {
        console.error("Receipt load error:", error);
        if (active) {
          setAccessError(error.message || "Unable to load receipts.");
          setReceipts([]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    verifyAccess();

    return () => {
      active = false;
    };
  }, [navigate]);

  const filtered = receipts.filter((receipt) => {
    const receiptYear =
      Number(receipt.receipt_date?.slice(0, 4)) ||
      Number(receipt.date?.slice(0, 4)) ||
      new Date().getFullYear();
    const yearMatches = receiptYear === year;
    const statusMatches =
      type === "All" ||
      String(receipt.status || "Received").toLowerCase() ===
        String(type).toLowerCase();
    const paymentMatches =
      paymentFilter === "All" ||
      String(
        receipt.payment_mode || receipt.paymentMode || "Cash",
      ).toLowerCase() === String(paymentFilter).toLowerCase();
    const eventMatches =
      eventFilter === "All Events" ||
      String(
        receipt.festival_name || receipt.event_name || receipt.event || "",
      ).toLowerCase() === eventFilter.toLowerCase();
    const searchMatches =
      `${receipt.receipt_number || receipt.receiptNumber || ""} ${receipt.donor_name || receipt.donorName || ""} ${receipt.whatsapp_number || receipt.whatsappNumber || ""} ${receipt.mobile_number || receipt.mobile || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return (
      yearMatches &&
      statusMatches &&
      paymentMatches &&
      eventMatches &&
      searchMatches
    );
  });

  const handleDelete = async (receipt) => {
    if (
      window.confirm(
        `Delete ${receipt.receipt_number || receipt.receiptNumber}?`,
      )
    ) {
      try {
        await deleteReceipt(receipt.id);
        setReceipts((current) =>
          current.filter((item) => item.id !== receipt.id),
        );
      } catch (error) {
        console.error("Delete receipt error:", error);
        window.alert(error.message || "Unable to delete receipt.");
      }
    }
  };

  const handlePrint = (receipt) => {
    window.open(
      `/admin/receipts/${receipt.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handlePdf = (receipt) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("ॐकार तरुण मंडळ", 14, 18);
    doc.setFontSize(12);
    doc.text(`Receipt No: ${receipt.receiptNumber}`, 14, 28);
    doc.text(
      `Donor: ${receipt.donorName || receipt.devoteeName || "-"}`,
      14,
      38,
    );
    doc.text(`Amount: ${formatCurrency(receipt.amount || 0)}`, 14, 48);
    doc.text(`Payment: ${receipt.paymentMode || "Cash"}`, 14, 58);
    doc.text(`Status: ${receipt.status || "Received"}`, 14, 68);
    doc.text(`Date: ${receipt.donationDate || receipt.date || "-"}`, 14, 78);
    doc.save(`${receipt.receiptNumber || "receipt"}.pdf`);
  };

  const handleShare = async (receipt) => {
    const text = buildReceiptText(receipt, "en");
    try {
      if (navigator.share) {
        await navigator.share({ title: receipt.receiptNumber, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        window.alert("Receipt text copied to clipboard.");
      }
    } catch {
      // user cancelled or browser blocked the interaction
    }
  };

  return (
    <div>
      {location.state?.success && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {location.state?.message || "Receipt saved successfully."}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-black text-[#202020]">Receipts</h1>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-full border border-orange-100 bg-white px-3 py-2 text-sm outline-none"
          >
            {[2026, 2025, 2024, 2023, 2022, 2021].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <Button onClick={() => navigate("/admin/receipts/new")}>
            + Add New Receipt
          </Button>
        </div>
      </div>

      {accessError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {accessError}
        </div>
      )}

      <div className="rounded-[30px] bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2 text-sm outline-none"
          >
            {["All", "Received", "Partial", "Pending"].map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2 text-sm outline-none"
          >
            {["All", ...paymentModes].map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2 text-sm outline-none"
          >
            {["All Events", ...events.map((event) => event.name)].map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
          <div className="flex items-center gap-3 rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2">
            <Search size={18} className="text-[#ff8a00]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search receipts"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading receipts...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No donation payments found"
            description="Create a donation to generate a receipt record."
            icon={ReceiptText}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((receipt) => {
              const receiptNo =
                receipt.receipt_number || receipt.receiptNumber || "-";
              const donorName = receipt.donor_name || receipt.donorName || "-";
              const whatsappNumber =
                receipt.whatsapp_number || receipt.whatsappNumber || "-";
              const festivalName =
                receipt.festival_name ||
                receipt.event_name ||
                receipt.event ||
                "Ganesh Festival";
              const amount = Number(
                receipt.donation_amount || receipt.amount || 0,
              );
              const status =
                receipt.status || receipt.payment_status || "Received";
              const date =
                receipt.receipt_date ||
                receipt.date ||
                receipt.created_at ||
                "-";

              return (
                <div
                  key={receipt.id}
                  className="rounded-[24px] border border-orange-100 bg-[#fffaf3] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-black text-[#202020]">
                        {receiptNo}
                      </div>
                      <div className="text-sm text-slate-500">
                        {donorName} • {whatsappNumber}
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="text-xl font-black text-[#202020]">
                        {formatCurrency(amount)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {festivalName} • {status}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          navigate(`/admin/receipts/${receipt.id}`)
                        }
                        className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#202020]"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handlePrint(receipt)}
                        className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#202020]"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => handlePdf(receipt)}
                        className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#202020]"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleShare(receipt)}
                        className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#202020]"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => handleDelete(receipt)}
                        className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {date} • Created by {receipt.created_by_name || "Admin"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpensesPage() {
  const [expenses, setExpenses] = useState(getExpenses());
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({
    title: "",
    category: "Decoration",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    paymentMode: "Cash",
    description: "",
  });

  const filtered = expenses.filter(
    (expense) =>
      expense.date.startsWith(String(year)) &&
      `${expense.title} ${expense.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const addExpense = (event) => {
    event.preventDefault();
    const next = [
      { ...form, amount: Number(form.amount), id: `exp-${Date.now()}` },
      ...getExpenses(),
    ];
    localStorage.setItem("mandal_expenses", JSON.stringify(next));
    setExpenses(next);
    setForm({
      title: "",
      category: "Decoration",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      paymentMode: "Cash",
      description: "",
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-[#202020]">Expenses</h1>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-full border border-orange-100 bg-white px-3 py-2 text-sm outline-none"
        >
          {[2026, 2025, 2024, 2023, 2022, 2021].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3 rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2">
          <Search size={18} className="text-[#ff8a00]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search expense..."
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No expenses found for selected year."
            description="Log your first expense to maintain an accurate ledger."
            icon={Wallet}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col gap-3 rounded-[24px] border border-orange-100 bg-[#fffaf3] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-lg font-black text-[#202020]">
                    {expense.title}
                  </div>
                  <div className="text-sm text-slate-500">
                    {expense.category} • {expense.paymentMode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[#202020]">
                    {formatCurrency(expense.amount)}
                  </div>
                  <div className="text-xs text-slate-500">{expense.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={addExpense}
        className="mt-6 grid gap-4 rounded-[30px] bg-white p-5 shadow-sm md:grid-cols-2"
      >
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Expense Name"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
        >
          {expenseCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <input
          required
          type="number"
          min="1"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Amount"
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
        />
        <select
          value={form.paymentMode}
          onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none md:col-span-2"
        >
          {paymentModes.map((mode) => (
            <option key={mode}>{mode}</option>
          ))}
        </select>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="md:col-span-2 min-h-[100px] rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          placeholder="Description"
        />
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">+ Add New Expense</Button>
        </div>
      </form>
    </div>
  );
}

function SponsorsPage() {
  const [sponsors, setSponsors] = useState(getSponsors());
  const [form, setForm] = useState({
    sponsorName: "",
    mobile: "",
    businessName: "",
    amount: "",
    sponsorType: "Main Sponsor",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const addSponsor = (event) => {
    event.preventDefault();
    const next = [
      { ...form, amount: Number(form.amount), id: `sp-${Date.now()}` },
      ...getSponsors(),
    ];
    localStorage.setItem("mandal_sponsors", JSON.stringify(next));
    setSponsors(next);
  };

  return (
    <div>
      <h1 className="mb-5 text-3xl font-black text-[#202020]">Sponsors</h1>
      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <form onSubmit={addSponsor} className="grid gap-4 md:grid-cols-2">
          <input
            required
            value={form.sponsorName}
            onChange={(e) => setForm({ ...form, sponsorName: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Sponsor Name"
          />
          <input
            required
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Mobile"
          />
          <input
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Business Name"
          />
          <input
            required
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Amount"
          />
          <select
            value={form.sponsorType}
            onChange={(e) => setForm({ ...form, sponsorType: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          >
            {sponsorTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="md:col-span-2 min-h-[100px] rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            placeholder="Notes"
          />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">Add Sponsor</Button>
          </div>
        </form>
      </div>
      <div className="mt-6 space-y-3">
        {sponsors.map((sponsor) => (
          <div
            key={sponsor.id}
            className="rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-black text-[#202020]">
                {sponsor.sponsorName}
              </div>
              <div className="font-bold text-[#ff8a00]">
                {formatCurrency(sponsor.amount)}
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {sponsor.businessName} • {sponsor.sponsorType}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingsPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Bookings</h1>
      <p className="mt-4 text-slate-600">
        Manage customer bookings, event reservations, and payment statuses.
      </p>
    </div>
  );
}
function GiftsPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Gifts</h1>
      <p className="mt-4 text-slate-600">
        Track offerings, donor gifts, and intended purpose.
      </p>
    </div>
  );
}
function AuctionPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Auction</h1>
      <p className="mt-4 text-slate-600">
        Manage items, bids, and live status.
      </p>
    </div>
  );
}
function VendorsPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Vendors</h1>
      <p className="mt-4 text-slate-600">
        Track vendors for decoration, sound, printing, and transport.
      </p>
    </div>
  );
}
function MembershipPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Membership</h1>
      <p className="mt-4 text-slate-600">
        Manage volunteer and member profiles and paid membership status.
      </p>
    </div>
  );
}
function CommitteeAdminPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Committee</h1>
      <p className="mt-4 text-slate-600">
        View the list of committee members and their roles.
      </p>
    </div>
  );
}
function UsersPage() {
  const users = getUsers();
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Users</h1>
      <div className="mt-6 space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-[22px] border border-orange-100 bg-[#fffaf3] p-4"
          >
            <div className="font-bold text-[#202020]">{user.name}</div>
            <div className="text-sm text-slate-500">
              {user.role} • {user.email}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function LedgerPage() {
  const ledger = getLedger();
  const balance = ledger.reduce(
    (sum, item) => sum + Number(item.income || 0) - Number(item.expense || 0),
    0,
  );
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Ledger</h1>
      <div className="mt-4 text-lg font-bold text-[#ff8a00]">
        Current balance: {formatCurrency(balance)}
      </div>
      <div className="mt-6 space-y-3">
        {ledger.map((row) => (
          <div
            key={row.id}
            className="rounded-[20px] border border-orange-100 bg-[#fffaf3] p-4 flex items-center justify-between"
          >
            <div>{row.description}</div>
            <div>{formatCurrency(row.income || row.expense)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ReportsPage() {
  const donations = getDonations();
  const expenses = getExpenses();
  const monthly = [
    { name: "Jan", total: 1200 },
    { name: "Feb", total: 2200 },
    { name: "Mar", total: 1800 },
    { name: "Apr", total: 3000 },
    { name: "May", total: 2500 },
  ];
  const pieData = [
    {
      name: "Donations",
      value: donations.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    },
    {
      name: "Expenses",
      value: expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-[#202020]">Reports</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[30px] bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-black text-[#202020]">
            Monthly Collection
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#ff8a00" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-[30px] bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-black text-[#202020]">
            Payment Summary
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                innerRadius={40}
              >
                <Cell fill="#ff8a00" />
                <Cell fill="#202020" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
function ExportPage() {
  const handleDownload = () => {
    const csv = "name,amount\nExample,5000\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mandal-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Export</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleDownload}>CSV</Button>
        <Button variant="secondary">Excel</Button>
        <Button variant="dark">PDF</Button>
      </div>
    </div>
  );
}
function PreferencesPage() {
  return (
    <div className="rounded-[30px] bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-black text-[#202020]">Preferences</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3"
          placeholder="Mandal Name"
          defaultValue={siteConfig.mandalName}
        />
        <input
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3"
          placeholder="Phone"
          defaultValue={siteConfig.phone}
        />
        <input
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3"
          placeholder="Email"
          defaultValue={siteConfig.email}
        />
        <input
          className="rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3"
          placeholder="UPI ID"
          defaultValue={siteConfig.upiId}
        />
      </div>
    </div>
  );
}

function CreateReceiptPage() {
  const navigate = useNavigate();
  const [accessError, setAccessError] = useState("");
  const events = getEvents();
  const defaultEvent = events.find(
    (event) => event.name === "Ganesh Festival",
  ) ||
    events[0] || { name: "Ganesh Festival" };
  const [collectorName, setCollectorName] = useState("Admin User");
  const [form, setForm] = useState({
    event: defaultEvent.name,
    whatsappNumber: "",
    devoteeName: "",
    amount: "",
    status: "Received",
    paymentMode: "Cash",
    donationType: "General Donation",
    collector: "Admin User",
    donationDate: new Date().toISOString().slice(0, 10),
    donationTime: new Date().toTimeString().slice(0, 5),
    backdateDonation: false,
    paymentReference: "",
    totalAmount: "",
    receivedAmount: "",
  });
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const quickAmounts = [51, 101, 151, 201, 301, 501, 1001];

  useEffect(() => {
    let active = true;

    const verifyAdminAndLoadCollector = async () => {
      if (!supabase) {
        setAccessError("Supabase is not configured.");
        return;
      }

      const sessionUser = await getSessionUser();
      if (!active) return;

      if (!sessionUser) {
        navigate("/login", { replace: true });
        return;
      }

      const adminRecord = await ensureAdminRecordForSessionUser(sessionUser);

      if (!adminRecord) {
        setAccessError("Admin access required.");
        navigate("/admin", { replace: true });
        return;
      }

      setCollectorName(sessionUser?.name || "Admin User");
      setForm((current) => ({
        ...current,
        collector: sessionUser?.name || current.collector || "Admin User",
      }));
    };

    verifyAdminAndLoadCollector();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    const contactNumber = normalizeMobile(form.whatsappNumber);
    if (!contactNumber || !isValidIndianMobile(contactNumber)) return;

    const existingDevotee = getDevotees().find(
      (devotee) => normalizeMobile(devotee.mobile) === contactNumber,
    );

    if (existingDevotee && !form.devoteeName) {
      setForm((current) => ({
        ...current,
        devoteeName: existingDevotee.name,
      }));
    }
  }, [form.whatsappNumber]);

  const validate = () => {
    const nextErrors = {};
    if (!form.event) nextErrors.event = "Please select an event.";
    if (!form.devoteeName)
      nextErrors.devoteeName = "Please enter devotee name.";
    if (!form.whatsappNumber || !isValidIndianMobile(form.whatsappNumber)) {
      nextErrors.whatsappNumber = "Please enter a valid mobile number.";
    }
    if (!form.amount || Number(form.amount) <= 0) {
      nextErrors.amount = "Please enter donation amount.";
    }
    if (!form.paymentMode)
      nextErrors.paymentMode = "Please select payment method.";

    if (form.status === "Partial") {
      const total = Number(form.totalAmount || 0);
      const received = Number(form.receivedAmount || 0);
      if (!form.totalAmount || total <= 0)
        nextErrors.totalAmount = "Please enter total amount.";
      if (!form.receivedAmount || received < 0)
        nextErrors.receivedAmount = "Please enter received amount.";
      if (total > 0 && received > total)
        nextErrors.receivedAmount =
          "Received amount cannot exceed total amount.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    const validated = validate();
    if (!validated) return;

    setIsSaving(true);

    try {
      const finalAmount = Number(form.amount || 0);
      const parsedStatus = form.status || "Received";
      const finalPaymentMode = form.paymentMode || "Cash";
      const donationDate = form.backdateDonation
        ? form.donationDate
        : new Date().toISOString().slice(0, 10);
      const sessionUser = await getSessionUser();
      const normalizedWhatsApp = normalizeIndianMobile(form.whatsappNumber);

      const receipt = {
        donor_name: form.devoteeName.trim(),
        donorName: form.devoteeName.trim(),
        whatsapp_number: normalizedWhatsApp,
        whatsappNumber: normalizedWhatsApp,
        mobile_number: normalizedWhatsApp,
        mobile: normalizedWhatsApp,
        donation_amount: finalAmount,
        amount: finalAmount,
        payment_method: finalPaymentMode,
        paymentMode: finalPaymentMode,
        payment_mode: finalPaymentMode,
        status: parsedStatus,
        payment_status: parsedStatus,
        festival_name: form.event,
        event_name: form.event,
        event: form.event,
        created_by_name: sessionUser?.name || form.collector || "Admin User",
        created_by_email: sessionUser?.email || "",
        receipt_date: donationDate,
        donation_date: donationDate,
        date: donationDate,
        created_at: new Date().toISOString(),
      };

      await addReceipt(receipt);

      setConfirmOpen(false);
      navigate("/admin/receipts", {
        state: { success: true, message: "Receipt saved successfully." },
      });
    } catch (error) {
      console.error("Save receipt error:", error);
      window.alert(
        error?.message || "Unable to save receipt. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldError = (field) =>
    errors[field] ? (
      <div className="mt-1 text-xs text-red-600">{errors[field]}</div>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {accessError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {accessError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
            Create Receipt
          </div>
          <h1 className="mt-2 text-3xl font-black text-[#202020]">
            Create New Receipt
          </h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[30px] bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#202020]">
              Festival Name
            </label>
            <select
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            >
              {events.map((event) => (
                <option key={event.id} value={event.name}>
                  {event.name}
                </option>
              ))}
            </select>
            {renderFieldError("event")}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#202020]">
              Donator WhatsApp Number
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3">
              <span className="text-orange-500">
                <Phone size={18} />
              </span>
              <input
                value={form.whatsappNumber}
                onChange={(e) =>
                  setForm({ ...form, whatsappNumber: e.target.value })
                }
                className="w-full bg-transparent outline-none"
                placeholder="9999999999"
              />
            </div>
            {renderFieldError("whatsappNumber")}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-[#202020]">
              Donator Name
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3">
              <span className="text-orange-500">
                <Search size={18} />
              </span>
              <input
                value={form.devoteeName}
                onChange={(e) =>
                  setForm({ ...form, devoteeName: e.target.value })
                }
                className="w-full bg-transparent outline-none"
                placeholder="Search existing devotee"
              />
            </div>
            {renderFieldError("devoteeName")}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#202020]">
              Receipt Number
            </label>
            <input
              readOnly
              value={getReceiptNumberNext()}
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#202020]">Date</label>
            <input
              type="date"
              value={form.donationDate}
              onChange={(e) =>
                setForm({ ...form, donationDate: e.target.value })
              }
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-[#202020]">
              Donation Amount
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3">
              <span className="font-bold text-orange-500">₹</span>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-transparent outline-none"
                placeholder="1001"
              />
            </div>
            {renderFieldError("amount")}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-[#202020]">
              Donation Type
            </label>
            <select
              value={form.donationType}
              onChange={(e) =>
                setForm({ ...form, donationType: e.target.value })
              }
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            >
              {receiptDonationTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#202020]">
              Payment Method
            </label>
            <select
              value={form.paymentMode}
              onChange={(e) =>
                setForm({ ...form, paymentMode: e.target.value })
              }
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
            >
              {paymentModes.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
            {renderFieldError("paymentMode")}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#202020]">
              Payment Reference
            </label>
            <input
              value={form.paymentReference}
              onChange={(e) =>
                setForm({ ...form, paymentReference: e.target.value })
              }
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
              placeholder={
                form.paymentMode === "UPI"
                  ? "UPI Transaction ID"
                  : form.paymentMode === "Cheque"
                    ? "Cheque Number"
                    : "Transaction Reference"
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-[#202020]">
              Payment Status
            </label>
            <div className="flex flex-wrap gap-3">
              {receiptStatusOptions.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-2 rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2"
                >
                  <input
                    type="radio"
                    checked={form.status === status}
                    onChange={() => setForm({ ...form, status })}
                    name="status"
                  />
                  <span className="text-sm font-medium">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {form.status === "Partial" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#202020]">
                  Total Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm({ ...form, totalAmount: e.target.value })
                  }
                  className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
                  placeholder="Total amount"
                />
                {renderFieldError("totalAmount")}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#202020]">
                  Received Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.receivedAmount}
                  onChange={(e) =>
                    setForm({ ...form, receivedAmount: e.target.value })
                  }
                  className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
                  placeholder="Received amount"
                />
                {renderFieldError("receivedAmount")}
              </div>
            </>
          )}

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-[#202020]">
              Quick Amounts
            </label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      amount: String(amount),
                    }))
                  }
                  className="rounded-full bg-[#fff7e6] px-3 py-2 text-sm font-semibold text-[#202020]"
                >
                  ₹{amount}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.backdateDonation}
              onChange={(e) =>
                setForm({ ...form, backdateDonation: e.target.checked })
              }
            />
            <span className="text-sm font-medium text-[#202020]">
              Backdate Donation
            </span>
          </div>

          {form.backdateDonation && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#202020]">
                  Donation Date
                </label>
                <input
                  type="date"
                  value={form.donationDate}
                  onChange={(e) =>
                    setForm({ ...form, donationDate: e.target.value })
                  }
                  className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#202020]">
                  Donation Time
                </label>
                <input
                  type="time"
                  value={form.donationTime}
                  onChange={(e) =>
                    setForm({ ...form, donationTime: e.target.value })
                  }
                  className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm((current) => ({
                  ...current,
                  devoteeName: "",
                  whatsappNumber: "",
                  amount: "",
                  donationDate: new Date().toISOString().slice(0, 10),
                }));
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Receipt"}
            </Button>
          </div>
        </div>
      </form>

      {confirmOpen && (
        <div className="rounded-[30px] bg-[#fff7e6] p-5 shadow-sm">
          <div className="mb-4 text-lg font-black text-[#202020]">
            Confirm Receipt
          </div>
          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <span className="font-semibold text-[#202020]">Event:</span>{" "}
              {form.event}
            </div>
            <div>
              <span className="font-semibold text-[#202020]">Devotee:</span>{" "}
              {form.devoteeName}
            </div>
            <div>
              <span className="font-semibold text-[#202020]">Amount:</span>{" "}
              {formatCurrency(form.amount || 0)}
            </div>
            <div>
              <span className="font-semibold text-[#202020]">Payment:</span>{" "}
              {form.paymentMode}
            </div>
            <div>
              <span className="font-semibold text-[#202020]">Status:</span>{" "}
              {form.status}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Confirm & Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { receiptId } = useParams();
  const [receipt, setReceipt] = useState(() =>
    getReceipts().find((entry) => entry.id === receiptId),
  );
  const [language, setLanguage] = useState("mr");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const nextReceipt = getReceipts().find((entry) => entry.id === receiptId);
    setReceipt(nextReceipt || null);
  }, [receiptId]);

  const handlePrint = () => window.print();

  const handleText = async () => {
    if (!receipt) return;
    const text = buildReceiptText(receipt, language);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      window.alert("Receipt text copied to clipboard.");
    } else {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${receipt.receiptNumber || "receipt"}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePdf = () => {
    if (!receipt) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("॥ श्री गणेशाय नमः ॥", 14, 18);
    doc.setFontSize(14);
    doc.text("ॐकार तरुण मंडळ", 14, 28);
    doc.setFontSize(11);
    doc.text(`Receipt No: ${receipt.receiptNumber}`, 14, 40);
    doc.text(`Donor: ${receipt.donorName || "-"}`, 14, 50);
    doc.text(`Amount: ${formatCurrency(receipt.amount || 0)}`, 14, 60);
    doc.text(`Status: ${receipt.status || "Received"}`, 14, 70);
    doc.save(`${receipt.receiptNumber || "receipt"}.pdf`);
  };

  const showQr = async () => {
    if (!receipt) return;
    const value = `Receipt:${receipt.receiptNumber}|Amount:${formatCurrency(receipt.amount || 0)}|Date:${receipt.date || "-"}`;
    const url = await QRCode.toDataURL(value, { margin: 1, width: 180 });
    setQrUrl(url);
  };

  const shareWhatsApp = () => {
    if (!receipt) return;
    const text = [
      "ॐकार तरुण मंडळ",
      "",
      "देणगी पावती",
      `पावती क्र.: ${receipt.receiptNumber}`,
      `देणगीदार: ${receipt.donorName || receipt.devoteeName}`,
      `रक्कम: ${formatCurrency(receipt.amount || 0)}`,
      `देयक पद्धत: ${receipt.paymentMode || "Cash"}`,
      `कार्यक्रम: ${receipt.event || "Ganesh Festival"}`,
      "",
      "आपल्या योगदानाबद्दल धन्यवाद!",
      "गणपती बाप्पा मोरया! 🙏",
    ].join("\n");
    const mobile = normalizeMobile(
      receipt.whatsappNumber || receipt.mobile || "",
    );
    const waLink = `https://wa.me/${mobile}?text=${encodeURIComponent(text)}`;
    window.open(waLink, "_blank", "noopener,noreferrer");
  };

  if (!receipt) {
    return (
      <div className="rounded-[30px] bg-white p-8 shadow-sm">
        Receipt not found.
      </div>
    );
  }

  const receiptMeta = {
    mr: {
      title: "देणगी पावती",
      receiptNo: "क्र.",
      donor: "देणगीदार",
      mobile: "मोबाईल नंबर",
      method: "देयक पद्धत",
      status: "स्थिती",
      donationType: "देणगीचा प्रकार",
      collector: "संकलककर्ता",
      amountLabel: "प्राप्त देणगी रक्कम",
      thanks: "Ganesh Festival साठी आपल्या योगदानाबद्दल धन्यवाद.",
      footer: "Computer Generated Receipt",
      signature: "Signature Not Required",
      printedOn: "Printed on:",
    },
    en: {
      title: "DONATION RECEIPT",
      receiptNo: "Receipt Number",
      donor: "Donor",
      mobile: "Mobile Number",
      method: "Payment Method",
      status: "Status",
      donationType: "Donation Type",
      collector: "Collector",
      amountLabel: "Donation Amount",
      thanks: "Thank you for your contribution to Ganesh Festival.",
      footer: "Computer Generated Receipt",
      signature: "Signature Not Required",
      printedOn: "Printed on:",
    },
  };

  const labels = receiptMeta[language] || receiptMeta.en;
  const displayDate =
    receipt.donationDate ||
    receipt.date ||
    new Date().toISOString().slice(0, 10);
  const displayTime = receipt.time || new Date().toTimeString().slice(0, 5);
  const amountInWords = `${toWords(receipt.amount || 0)} rupees only`;

  return (
    <div className="receipt-print-shell px-2 py-4 sm:px-4">
      <div className="mx-auto max-w-4xl">
        <div className="hide-on-print mb-6 flex items-center justify-between gap-3 rounded-[24px] bg-white p-3 shadow-sm">
          <button
            className="flex items-center gap-2 text-sm font-bold text-[#202020]"
            onClick={() => navigate(-1)}
          >
            <ChevronRight size={16} className="rotate-180" /> RECEIPT
          </button>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-full border border-orange-100 bg-[#fffaf3] px-3 py-2 text-sm outline-none"
          >
            <option value="mr">Marathi</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="rounded-[30px] border border-orange-100 bg-white p-4 shadow-lg sm:p-8 print:shadow-none">
          <div className="mb-6 text-center">
            <div className="text-lg font-black text-[#202020]">
              ॥ श्री गणेशाय नमः ॥
            </div>
            <div className="mt-2 text-2xl font-black text-[#202020]">
              ॐकार तरुण मंडळ
            </div>
            <div className="mt-1 text-sm text-slate-600">kaneri</div>
            <div className="text-sm text-slate-600">kaneri.phata</div>
            <div className="text-sm text-slate-600">
              Kolhapur, महाराष्ट्र - 416003
            </div>
          </div>

          <div className="border-b border-orange-200 pb-4">
            <div className="text-center text-xl font-black text-[#202020]">
              {labels.title}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-[#202020]">
                  {labels.receiptNo}:
                </span>{" "}
                {receipt.receiptNumber}
              </div>
              <div>
                <span className="font-semibold text-[#202020]">तारीख:</span>{" "}
                {formatReceiptDate(displayDate)}
              </div>
              <div>
                <span className="font-semibold text-[#202020]">वेळ:</span>{" "}
                {formatReceiptTime(displayTime)}
              </div>
            </div>
            <div className="rounded-[22px] bg-[#fffaf3] p-4">
              <div className="text-sm font-semibold text-[#202020]">
                {labels.donor}
              </div>
              <div className="mt-1 text-lg font-black text-[#202020]">
                {receipt.donorName || receipt.devoteeName}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] bg-[#fffaf3] p-4">
              <div className="text-sm text-slate-500">{labels.mobile}</div>
              <div className="mt-2 text-lg font-bold text-[#202020]">
                ********
                {String(
                  normalizeMobile(
                    receipt.whatsappNumber || receipt.mobile || "",
                  ),
                ).slice(-4)}
              </div>
            </div>
            <div className="rounded-[22px] bg-[#fffaf3] p-4">
              <div className="text-sm text-slate-500">{labels.method}</div>
              <div className="mt-2 text-lg font-bold text-[#202020]">
                {receipt.paymentMode || "Cash"}
              </div>
            </div>
            <div className="rounded-[22px] bg-[#fffaf3] p-4">
              <div className="text-sm text-slate-500">{labels.status}</div>
              <div className="mt-2 text-lg font-bold text-[#202020]">
                {receipt.status || "Received"}
              </div>
            </div>
            <div className="rounded-[22px] bg-[#fffaf3] p-4">
              <div className="text-sm text-slate-500">
                {labels.donationType}
              </div>
              <div className="mt-2 text-lg font-bold text-[#202020]">
                {receipt.donationType || "General Donation"}
              </div>
            </div>
            <div className="md:col-span-2 rounded-[22px] bg-[#fffaf3] p-4">
              <div className="text-sm text-slate-500">{labels.collector}</div>
              <div className="mt-2 text-lg font-bold text-[#202020]">
                {receipt.collector || "Admin User"}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] bg-[#fff7e6] p-5 text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              {labels.amountLabel}
            </div>
            <div className="mt-3 text-4xl font-black text-[#202020]">
              ₹{Number(receipt.amount || 0).toLocaleString("en-IN")}/-
            </div>
            <div className="mt-3 text-sm text-slate-600">{amountInWords}</div>
          </div>

          <div className="mt-6 text-center text-base font-medium text-slate-700">
            {labels.thanks}
          </div>

          <div className="mt-8 border-t border-orange-200 pt-5 text-sm text-slate-500">
            <div className="flex items-center justify-between">
              <span>{labels.footer}</span>
              <span>{labels.signature}</span>
            </div>
            <div className="mt-3">
              {labels.printedOn} {new Date().toLocaleString("en-GB")}
            </div>
          </div>

          <div className="hide-on-print mt-8 flex flex-wrap gap-3">
            <Button onClick={handlePrint}>PRINT</Button>
            <Button variant="secondary" onClick={handleText}>
              TEXT
            </Button>
            <Button variant="dark" onClick={handlePdf}>
              PDF
            </Button>
            <Button variant="ghost" onClick={showQr}>
              SHOW RECEIPT QR
            </Button>
            <Button variant="secondary" onClick={shareWhatsApp}>
              Share on WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {qrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[30px] bg-white p-5 shadow-xl">
            <div className="mb-4 text-xl font-black text-[#202020]">
              Receipt QR
            </div>
            <div className="flex justify-center rounded-2xl bg-[#fffaf3] p-4">
              <img src={qrUrl} alt="Receipt QR" className="h-52 w-52" />
            </div>
            <div className="mt-4 text-sm text-slate-600">
              Receipt No: {receipt.receiptNumber}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setQrUrl("")}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(form);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError("Authentication service unavailable.");
        return;
      }

      navigate("/admin");
    } catch (error) {
      console.error("Login submit error:", error);
      setError("Authentication service unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#ff8a00] p-4">
      <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-[0_30px_40px_rgba(0,0,0,0.15)]">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fff7e6] text-3xl font-black text-[#ff8a00]">
            ॐ
          </div>
        </div>
        <div className="text-center text-xs font-bold uppercase tracking-[0.24em] text-orange-500">
          Welcome
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#202020]">
              Email Address
            </label>
            <input
              value={form.email}
              name="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              autoComplete="email"
              className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 outline-none"
              placeholder="admin@mandal.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#202020]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                className="w-full rounded-2xl border border-orange-100 bg-[#fffaf3] px-4 py-3 pr-11 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-3 flex items-center justify-center text-sm font-semibold text-[#ff8a00]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminLayout />} />
      <Route path="/*" element={<PublicLayout />} />
    </Routes>
  );
}

export default App;
