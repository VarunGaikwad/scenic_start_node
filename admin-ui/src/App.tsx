import React, { useState, useEffect } from "react";
import {
  Users,
  Bookmark,
  Quote,
  Calendar,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Edit2,
  Trash2,
  Folder,
  Link as LinkIcon,
  ShieldCheck,
  KeyRound,
  Mail,
  X,
  ExternalLink,
  MessageSquare,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  Hash,
  Activity,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- API Service ---
class AdminAPI {
  private token: string | null = localStorage.getItem("admin_token");

  async request(url: string, options: RequestInit = {}) {
    const headers: any = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`/api${url}`, { ...options, headers });

    if (response.status === 401) {
      this.logout();
      window.location.reload();
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.message || "Request failed");
    }
    return response.json();
  }

  async login(credentials: any) {
    const data = await this.request("/unauth/login", {
      method: "POST",
      body: JSON.stringify({ ...credentials, isAdmin: true }),
    });
    this.token = data.token;
    localStorage.setItem("admin_token", data.token);
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem("admin_token");
  }

  isAuthenticated() {
    return !!this.token;
  }
}

const api = new AdminAPI();

// --- Types ---
type Resource =
  | "dashboard"
  | "users"
  | "bookmarks"
  | "shayari-quotes"
  | "calendar-reminders"
  | "background-images";

// --- Components ---

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login({ email, password });
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-portal">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold font-heading">Admin Central</h1>
          <p className="text-secondary text-sm mt-2">
            Sign in to manage Scenic OS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-dim tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
                size={18}
              />
              <input
                type="email"
                className="form-control pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@scenic.io"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-dim tracking-wider">
              Access Token
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
                size={18}
              />
              <input
                type="password"
                className="form-control pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && (
            <div className="text-red-400 text-xs text-center bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full h-12 text-base mt-2"
            disabled={loading}
          >
            {loading ? <div className="loading-spinner" /> : "Sign In"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Sidebar = ({
  active,
  setActive,
  onLogout,
}: {
  active: Resource;
  setActive: (res: Resource) => void;
  onLogout: () => void;
}) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
    { id: "shayari-quotes", label: "Quotes", icon: Quote },
    { id: "calendar-reminders", label: "Reminders", icon: Calendar },
    { id: "background-images", label: "Wallpapers", icon: ImageIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
          <ShieldCheck size={18} />
        </div>
        <span className="font-bold font-heading text-lg">Scenic Console</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`nav-link ${active === item.id ? "active" : ""}`}
            onClick={() => setActive(item.id as Resource)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="nav-link text-red-400 mt-auto" onClick={onLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </div>
    </aside>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [activeResource, setActiveResource] = useState<Resource>("dashboard");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<any>({
    users: 0,
    bookmarks: 0,
    shayari: 0,
    reminders: 0,
    backgrounds: 0,
  });

  useEffect(() => {
    if (isAuthenticated) {
      if (activeResource === "dashboard") {
        fetchStats();
      } else {
        fetchData();
      }
    }
  }, [activeResource, isAuthenticated]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [u, b, s, r, bg] = await Promise.all([
        api.request("/admin/users"),
        api.request("/admin/bookmarks"),
        api.request("/admin/shayari-quotes"),
        api.request("/admin/background-images"),
        api.request("/admin/calendar-reminders"),
      ]);
      setStats({
        users: u.length,
        bookmarks: b.length,
        shayari: s.length,
        backgrounds: r.length,
        reminders: bg.length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const json = await api.request(`/admin/${activeResource}`);
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Confirm deletion of this resource?")) return;
    try {
      await api.request(`/admin/${activeResource}/${id}`, { method: "DELETE" });
      setData(data.filter((item) => item._id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSave = async (payload: any) => {
    try {
      if (editingItem) {
        const updated = await api.request(
          `/admin/${activeResource}/${editingItem._id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
        setData(
          data.map((item) =>
            item._id === editingItem._id ? updated.value || updated : item,
          ),
        );
      } else {
        const created = await api.request(`/admin/${activeResource}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setData([created, ...data]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  if (!isAuthenticated)
    return <Login onLogin={() => setIsAuthenticated(true)} />;

  const filteredData = data.filter((item) => {
    const s = searchTerm.toLowerCase();
    const content = JSON.stringify(item).toLowerCase();
    return content.includes(s);
  });

  return (
    <div className="app-container">
      <Sidebar
        active={activeResource}
        setActive={setActiveResource}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold font-heading capitalize">
              {activeResource.replace("-", " ")}
            </h1>
            <p className="text-secondary text-sm mt-1">
              Management overview for Scenic ecosystem
            </p>
          </div>

          {activeResource !== "dashboard" && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dim"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="form-control pl-10 h-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary h-10"
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Create New</span>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <div className="loading-spinner" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary">
              Retrieving Central Hub Data...
            </span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeResource}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeResource === "dashboard" && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {[
                      {
                        label: "Accounts",
                        count: stats.users,
                        icon: Users,
                        color: "var(--accent-primary)",
                      },
                      {
                        label: "Assets",
                        count: stats.bookmarks,
                        icon: Bookmark,
                        color: "var(--warning)",
                      },
                      {
                        label: "Intel",
                        count: stats.shayari,
                        icon: Quote,
                        color: "var(--success)",
                      },
                      {
                        label: "Neural Nodes",
                        count: stats.reminders,
                        icon: Calendar,
                        color: "#a855f7",
                      },
                      {
                        label: "Atmosphere",
                        count: stats.backgrounds,
                        icon: ImageIcon,
                        color: "#f43f5e",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="card flex items-center gap-4"
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${stat.color}10`,
                            color: stat.color,
                          }}
                        >
                          <stat.icon size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase text-dim tracking-wider">
                            {stat.label}
                          </div>
                          <div className="text-2xl font-bold font-heading">
                            {stat.count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="card p-8">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold font-heading flex items-center gap-2">
                          <Activity className="text-blue-500" size={20} />{" "}
                          System Infrastructure
                        </h2>
                        <div className="px-3 py-1 bg-green-500/10 text-success rounded-full text-[10px] font-bold">
                          STABLE
                        </div>
                      </div>
                      <div className="space-y-4">
                        {["Identity Hub", "Content CDN", "Neural Service"].map(
                          (node) => (
                            <div
                              key={node}
                              className="flex items-center justify-between p-4 bg-tertiary/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-success rounded-full shadow-[0_0_8px_var(--success)]" />
                                <span className="font-medium">{node}</span>
                              </div>
                              <span className="text-xs text-secondary font-mono">
                                NOMINAL
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="card p-8 flex flex-col justify-center items-center text-center">
                      <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                        <Layers size={32} />
                      </div>
                      <h2 className="text-xl font-bold font-heading">
                        Full System Access
                      </h2>
                      <p className="text-secondary text-sm mt-3 max-w-xs">
                        Use the sidebar to navigate through specific sub-modules
                        of the Scenic OS ecosystem.
                      </p>
                      <button
                        className="btn btn-secondary mt-8"
                        onClick={() => setActiveResource("users")}
                      >
                        Verify Users <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeResource === "users" && (
                <div className="table-container shadow-xl">
                  <table>
                    <thead>
                      <tr>
                        <th>Identity</th>
                        <th>Protocol</th>
                        <th>Verification</th>
                        <th>Terminal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((user: any) => (
                        <tr key={user._id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">
                                {user.email?.[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold">{user.email}</div>
                                <div className="text-[10px] text-dim font-mono">
                                  {user._id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${user.role === "admin" ? "badge-amber" : "badge-blue"}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td>
                            {user.emailVerified ? (
                              <div className="flex items-center gap-2 text-success text-xs font-bold">
                                <CheckCircle2 size={14} /> SECURE
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-dim text-xs font-bold">
                                <Clock size={14} /> PENDING
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button
                                className="action-btn edit"
                                onClick={() => openEdit(user)}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={(e) => handleDelete(user._id, e)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeResource === "bookmarks" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredData.map((item: any) => (
                    <div key={item._id} className="card group">
                      <div className="flex items-start justify-between mb-6">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === "folder" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}
                        >
                          {item.type === "folder" ? (
                            <Folder size={22} />
                          ) : (
                            <LinkIcon size={22} />
                          )}
                        </div>
                        <div className="actions-cell opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="action-btn edit"
                            onClick={() => openEdit(item)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={(e) => handleDelete(item._id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1 truncate">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-dim">
                          <Hash size={12} />{" "}
                          <span className="truncate">
                            {item.url || "Virtual Directory"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-dim uppercase">
                        <div className="flex items-center gap-1">
                          <UserIcon size={10} />{" "}
                          {item.userId?.slice(-6) || "SYS"}
                        </div>
                        <span
                          className={
                            item.type === "folder"
                              ? "text-amber-500"
                              : "text-blue-500"
                          }
                        >
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeResource === "shayari-quotes" && (
                <div className="space-y-4">
                  {filteredData.map((item: any) => (
                    <div
                      key={item._id}
                      className="card flex items-center gap-6 group"
                    >
                      <div className="w-12 h-12 shrink-0 bg-emerald-500/10 text-success rounded-xl flex items-center justify-center">
                        <Quote size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="badge badge-green">{item.type}</span>
                          {item.tags?.slice(0, 3).map((t: string) => (
                            <span
                              key={t}
                              className="text-[10px] font-bold text-dim uppercase tracking-wider"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                        <div className="text-lg font-medium leading-tight truncate">
                          "{item.text}"
                        </div>
                        <div className="text-xs text-dim mt-2">
                          — {item.author || "Proprietary Content"}
                        </div>
                      </div>
                      <div className="actions-cell opacity-0 group-hover:opacity-100 animate-fade-in">
                        <button
                          className="action-btn edit"
                          onClick={() => openEdit(item)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={(e) => handleDelete(item._id, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeResource === "calendar-reminders" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredData.map((item: any) => (
                    <div key={item._id} className="card relative group">
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${item.priority === "high" ? "bg-danger" : item.priority === "medium" ? "bg-warning" : "bg-blue-500"}`}
                      />
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-xl">{item.title}</h3>
                          <div className="text-[10px] text-dim font-bold uppercase mt-1">
                            Subject: {item.userId?.slice(-6)}
                          </div>
                        </div>
                        <div className="actions-cell">
                          <button
                            className="action-btn edit"
                            onClick={() => openEdit(item)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={(e) => handleDelete(item._id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-secondary text-sm mb-6 line-clamp-2">
                        {item.description || "Data directive not specified."}
                      </p>
                      <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-2 text-blue-500">
                          <Clock size={14} />{" "}
                          {item.dueDate
                            ? new Date(item.dueDate).toLocaleDateString()
                            : "REALTIME"}
                        </div>
                        <div
                          className={
                            item.priority === "high"
                              ? "text-danger"
                              : "text-warning"
                          }
                        >
                          {item.priority} CRITICALITY
                        </div>
                        {item.completed && (
                          <div className="ml-auto text-success flex items-center gap-1">
                            <CheckCircle2 size={14} /> DONE
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeResource === "background-images" && (
                <div className="wallpaper-grid">
                  {filteredData.map((item: any) => (
                    <div key={item._id} className="wallpaper-card group">
                      <img
                        src={item.image_url}
                        className="wallpaper-img"
                        alt="Node Visual"
                      />
                      <div className="wallpaper-overlay">
                        <div className="flex justify-between items-center bg-white/10 backdrop-blur-xl p-3 rounded-xl border border-white/10 mb-2">
                          <div className="flex gap-2">
                            <button
                              className="action-btn edit"
                              onClick={() => openEdit(item)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={(e) => handleDelete(item._id, e)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <a
                            href={item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="action-btn"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/50">
                          <span>Contrast: {item.text_color}</span>
                          {item.is_welcome && (
                            <span className="text-blue-400">Welcome Node</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={editingItem}
          resource={activeResource}
          onSave={handleSave}
        />
      </main>
    </div>
  );
}

// --- Form Modal Refined ---
const FormModal = ({ isOpen, onClose, item, resource, onSave }: any) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (item) setFormData(item);
    else {
      const d: any = {};
      if (resource === "users") {
        d.role = "user";
        d.status = "active";
      }
      if (resource === "bookmarks") {
        d.type = "link";
      }
      if (resource === "shayari-quotes") {
        d.type = "quote";
        d.tags = [];
      }
      if (resource === "calendar-reminders") {
        d.priority = "medium";
        d.completed = false;
      }
      if (resource === "background-images") {
        d.text_color = "light";
        d.is_welcome = false;
      }
      setFormData(d);
    }
  }, [item, resource, isOpen]);

  if (!isOpen) return null;

  const update = (f: string, v: any) => setFormData({ ...formData, [f]: v });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="text-xl font-bold font-heading">
            {item ? "Modify Resource" : "Initialize Node"}
          </h2>
          <button className="action-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-6">
          {resource === "users" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  Network Identity (Email)
                </label>
                <input
                  className="form-control"
                  value={formData.email || ""}
                  onChange={(e) => update("email", e.target.value)}
                  disabled={!!item}
                  placeholder="identity@node.io"
                />
              </div>
              {!item && (
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Secret Key (Password)
                  </label>
                  <input
                    className="form-control"
                    type="password"
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Minimum 12 entropy bits"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Auth Level
                  </label>
                  <select
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => update("role", e.target.value)}
                  >
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Node Status
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="active">OPERATIONAL</option>
                    <option value="inactive">SUSPENDED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {resource === "bookmarks" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  Subject Owner ID
                </label>
                <input
                  className="form-control"
                  value={formData.userId || ""}
                  onChange={(e) => update("userId", e.target.value)}
                  placeholder="User ObjectId"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  Asset Designation
                </label>
                <input
                  className="form-control"
                  value={formData.title || ""}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Asset Architecture
                  </label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => update("type", e.target.value)}
                  >
                    <option value="link">EXTERNAL URI</option>
                    <option value="folder">DIRECTORY NODE</option>
                  </select>
                </div>
                {formData.type === "link" && (
                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase text-dim">
                      URI Source
                    </label>
                    <input
                      className="form-control"
                      value={formData.url || ""}
                      onChange={(e) => update("url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {resource === "shayari-quotes" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  Creative Data Stream
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={formData.text || ""}
                  onChange={(e) => update("text", e.target.value)}
                  placeholder="Input text payload..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Stream Type
                  </label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => update("type", e.target.value)}
                  >
                    <option value="quote">QUOTE</option>
                    <option value="shayari">SHAYARI</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Credit Attribution
                  </label>
                  <input
                    className="form-control"
                    value={formData.author || ""}
                    onChange={(e) => update("author", e.target.value)}
                    placeholder="Author"
                  />
                </div>
              </div>
            </div>
          )}

          {resource === "calendar-reminders" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  Target User ID
                </label>
                <input
                  className="form-control"
                  value={formData.userId || ""}
                  onChange={(e) => update("userId", e.target.value)}
                  placeholder="User ObjectId"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  Directive Title
                </label>
                <input
                  className="form-control"
                  value={formData.title || ""}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Operation Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Temporal Marker
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    value={
                      formData.dueDate
                        ? new Date(formData.dueDate).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => update("dueDate", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Criticality
                  </label>
                  <select
                    className="form-control"
                    value={formData.priority}
                    onChange={(e) => update("priority", e.target.value)}
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {resource === "background-images" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-dim">
                  CDN URI (Image URL)
                </label>
                <input
                  className="form-control"
                  value={formData.image_url || ""}
                  onChange={(e) => update("image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-dim">
                    Contrast Matrix
                  </label>
                  <select
                    className="form-control"
                    value={formData.text_color}
                    onChange={(e) => update("text_color", e.target.value)}
                  >
                    <option value="light">LIGHT MODE</option>
                    <option value="dark">DARK MODE</option>
                  </select>
                </div>
                <div className="flex items-end pb-1.5 gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_welcome}
                    onChange={(e) => update("is_welcome", e.target.checked)}
                  />
                  <label className="text-xs font-bold uppercase text-dim">
                    Entry Node wallpaper
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary flex-1" onClick={onClose}>
            Abort
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={() => onSave(formData)}
          >
            {item ? "Commit Edit" : "Deploy Node"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
