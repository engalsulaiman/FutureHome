import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Project } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Projects() {
  const { orgId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setProjects(await api<Project[]>("/projects/"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load projects");
    }
  }

  useEffect(() => {
    load();
  }, [orgId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api<Project>("/projects/", {
        method: "POST",
        body: JSON.stringify({ name, description: description || null }),
      });
      setName("");
      setDescription("");
      setCreating(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create project");
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Projects</h2>
        <button className="button" onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "New project"}
        </button>
      </div>
      {creating && (
        <div className="card">
          <form onSubmit={submit}>
            <div className="form-row">
              <label>Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label>Description</label>
              <textarea
                className="input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button className="button" type="submit">Create</button>
            {err && <div className="error">{err}</div>}
          </form>
        </div>
      )}
      <div className="card" style={{ marginTop: 12 }}>
        {projects.length === 0 ? (
          <p className="muted">No projects yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/projects/${p.id}`}>{p.name}</Link></td>
                  <td className="muted">{p.slug}</td>
                  <td>{p.description ?? <span className="muted">—</span>}</td>
                  <td><Link to={`/projects/${p.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
