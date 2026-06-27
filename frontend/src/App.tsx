import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import RunDetail from "./pages/RunDetail";

function Layout({ children }: { children: React.ReactNode }) {
  const { me, orgId, switchOrg, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <h1>FutureHome</h1>
        {me && me.memberships.length > 1 && (
          <div className="org-switcher">
            <select
              value={orgId ?? ""}
              onChange={(e) => switchOrg(Number(e.target.value))}
            >
              {me.memberships.map((m) => (
                <option key={m.organization.id} value={m.organization.id}>
                  {m.organization.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>
        <div className="footer">
          {me && (
            <>
              <div>{me.user.email}</div>
              <button
                className="button secondary"
                style={{ marginTop: 8, width: "100%" }}
                onClick={logout}
              >
                Log out
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-page">Loading…</div>;
  if (!me) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
      <Route
        path="/projects/:projectId"
        element={<RequireAuth><ProjectDetail /></RequireAuth>}
      />
      <Route path="/runs/:runId" element={<RequireAuth><RunDetail /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
