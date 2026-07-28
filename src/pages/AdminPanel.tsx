import AppLayout from "@/components/AppLayout";
import { Users, Shield, Trash2, Ban, CheckCircle, Pencil, X, KeyRound, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { admin as adminApi, AdminUser } from "@/lib/api";

const roleBadge = (role: string) => {
  const colors: Record<string, string> = {
    admin: "bg-accent/20 text-accent",
    moderator: "bg-blue-500/20 text-blue-400",
    agent: "bg-amber-500/20 text-amber-400",
    user: "bg-muted text-muted-foreground",
  };
  return colors[role] || colors.user;
};

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editRole, setEditRole] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
    plan: "free",
  });

  const fetchUsers = async (p = page) => {
    setLoading(true);
    try {
      const data = await adminApi.list({
        page: p,
        page_size: 25,
        search: search || undefined,
        role: roleFilter || undefined,
        active: activeFilter || undefined,
      });
      setUsers(data.items || []);
      setPage(data.page || p);
      setTotalPages(data.total_pages || 0);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, activeFilter]);

  const handleBan = async (u: AdminUser) => {
    if (u.id === user?.id) {
      toast.error("You cannot change your own status this way");
      return;
    }
    setSubmitting(true);
    try {
      if (u.banned || u.active === false) await adminApi.activate(u.id);
      else await adminApi.deactivate(u.id);
      toast.success(u.banned || u.active === false ? "User activated" : "User deactivated");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("Cannot delete yourself");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    setSubmitting(true);
    try {
      await adminApi.remove(userId);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Send a password reset email to this user?")) return;
    setSubmitting(true);
    try {
      await adminApi.resetPassword(userId);
      toast.success("Password reset sent");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await adminApi.setRole(editingUser.id, editRole);
      await adminApi.setPlan(editingUser.id, editPlan);
      toast.success("User updated");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error("Name, email, and password are required");
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.create(createForm);
      toast.success("User created");
      setShowCreate(false);
      setCreateForm({ email: "", password: "", full_name: "", role: "user", plan: "free" });
      fetchUsers(1);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditPlan(u.plan);
    setEditRole(u.roles?.[0] || u.role || "user");
  };

  const isActive = (u: AdminUser) => u.active !== false && !u.banned;

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Admin <span className="text-gradient-green">Users</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage platform users, roles, and access.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm text-accent font-medium">Admin Access</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-green text-sm text-primary-foreground"
          >
            <UserPlus className="w-4 h-4" /> Create user
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users", value: total },
          { label: "Admins", value: users.filter((u) => (u.roles || []).includes("admin") || u.role === "admin").length },
          { label: "Active (page)", value: users.filter(isActive).length },
          { label: "Inactive (page)", value: users.filter((u) => !isActive(u)).length },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-display font-bold mt-1">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
          placeholder="Search name or email"
          className="bg-muted rounded-xl px-3 py-2 text-sm min-w-[200px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-muted rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="agent">Agent</option>
          <option value="user">User</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="bg-muted rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={() => fetchUsers(1)} className="px-3 py-2 rounded-xl bg-muted text-sm">
          Search
        </button>
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="font-display font-semibold">All Users</h2>
        </div>

        <div className="hidden lg:grid grid-cols-8 px-5 py-3 text-xs text-muted-foreground uppercase tracking-wider bg-muted/50">
          <span>Name</span>
          <span>Email</span>
          <span>Company</span>
          <span>Plan</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last login</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No users found.</div>
        ) : (
          users.map((u) => {
            const role = u.roles?.[0] || u.role || "user";
            const self = u.id === user?.id;
            return (
              <div
                key={u.id}
                className="grid lg:grid-cols-8 gap-2 px-5 py-4 border-t border-border text-sm items-center"
              >
                <span className="font-medium truncate">{u.full_name || "—"}</span>
                <span className="truncate text-muted-foreground">{u.email}</span>
                <span className="truncate">{u.company_name || "—"}</span>
                <span className="capitalize">{u.plan}</span>
                <span>
                  <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${roleBadge(role)}`}>
                    {role}
                  </span>
                </span>
                <span>{isActive(u) ? "Active" : "Inactive"}</span>
                <span className="text-xs text-muted-foreground">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    title="Edit"
                    disabled={submitting}
                    onClick={() => openEdit(u)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title={isActive(u) ? "Deactivate" : "Activate"}
                    disabled={submitting || self}
                    onClick={() => handleBan(u)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40"
                  >
                    {isActive(u) ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button
                    title="Send password reset"
                    disabled={submitting}
                    onClick={() => handleResetPassword(u.id)}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete"
                    disabled={submitting || self}
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page <= 1 || loading}
            onClick={() => fetchUsers(page - 1)}
            className="px-3 py-2 rounded-xl bg-muted text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => fetchUsers(page + 1)}
            className="px-3 py-2 rounded-xl bg-muted text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-semibold">Edit user</h3>
              <button onClick={() => setEditingUser(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{editingUser.email}</p>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
            >
              <option value="user">user</option>
              <option value="agent">agent</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
            <select
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value)}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
            >
              <option value="free">free</option>
              <option value="starter">starter</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
            <button
              disabled={submitting}
              onClick={handleSaveEdit}
              className="w-full py-2.5 rounded-xl gradient-green text-sm text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-semibold">Create user</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              placeholder="Full name"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="Temporary password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
            >
              <option value="user">user</option>
              <option value="agent">agent</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
            <button
              disabled={submitting}
              onClick={handleCreate}
              className="w-full py-2.5 rounded-xl gradient-green text-sm text-primary-foreground disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminPanel;
