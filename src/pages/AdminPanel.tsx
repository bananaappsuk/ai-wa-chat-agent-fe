import AppLayout from "@/components/AppLayout";
import { Users, Shield, Trash2, Ban, CheckCircle, Crown, Pencil, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { admin as adminApi, AdminUser } from "@/lib/api";

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editRole, setEditRole] = useState("");

  const fetchUsers = async () => {
    try {
      const data = await adminApi.list();
      setUsers(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (userId: string, banned: boolean) => {
    try {
      if (banned) await adminApi.unban(userId);
      else await adminApi.ban(userId);
      toast.success(banned ? "User enabled" : "User disabled");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await adminApi.remove(userId);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await adminApi.setRole(editingUser.id, editRole);
      await adminApi.setPlan(editingUser.id, editPlan);
      toast.success("User updated");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditPlan(u.plan);
    setEditRole(u.roles[0] || u.role || "user");
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Admin <span className="text-gradient-green">Panel</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage all platform users, roles, and plans.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10">
          <Shield className="w-4 h-4 text-accent" />
          <span className="text-sm text-accent font-medium">Admin Access</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users", value: users.length },
          { label: "Admins", value: users.filter(u => u.roles.includes("admin")).length },
          { label: "Active", value: users.filter(u => !u.banned).length },
          { label: "Disabled", value: users.filter(u => u.banned).length },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-display font-bold mt-1">{loading ? "—" : s.value}</p>
          </div>
        ))}
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
          <span>Joined</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No users found.</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className={`grid grid-cols-1 lg:grid-cols-8 gap-2 lg:gap-0 items-center px-5 py-4 border-t border-border ${u.banned ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold">{(u.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                </div>
                <p className="font-medium text-sm truncate">{u.full_name || "—"}</p>
              </div>
              <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              <p className="text-sm text-muted-foreground truncate">{u.company_name || "—"}</p>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium w-fit capitalize">{u.plan}</span>
              <div className="flex items-center gap-1">
                {u.roles.includes("admin") && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                <span className="text-xs capitalize">{u.roles[0] || "user"}</span>
              </div>
              <span className={`text-xs font-medium ${u.banned ? "text-destructive" : "text-accent"}`}>
                {u.banned ? "Disabled" : "Active"}
              </span>
              <p className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => handleBan(u.id, u.banned)} className="p-1.5 rounded-lg hover:bg-muted" title={u.banned ? "Enable" : "Disable"}>
                  {u.banned ? <CheckCircle className="w-3.5 h-3.5 text-accent" /> : <Ban className="w-3.5 h-3.5 text-yellow-400" />}
                </button>
                {u.id !== user?.id && (
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-destructive/10" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">Edit User</h2>
              <button onClick={() => setEditingUser(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">User</p>
                <p className="font-medium">{editingUser.full_name || editingUser.email}</p>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Plan</label>
                <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminPanel;
