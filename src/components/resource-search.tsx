"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Branch, Resource, Subject } from "@/lib/types";

type Catalog = { branches: Branch[]; subjects: Subject[] };
export function ResourceSearch({ catalog }: { catalog: Catalog }) {
  const initial = useSearchParams();
  const [filters, setFilters] = useState({ q: initial.get("q") || "", branch: initial.get("branch") || "", subject: initial.get("subject") || "", semester: initial.get("semester") || "", type: initial.get("type") || "", year: initial.get("year") || "", sort: initial.get("sort") || "newest" });
  const [resources, setResources] = useState<Resource[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (pageNumber: number, values: typeof filters, append = false) => {
    setBusy(true); setError("");
    const params = new URLSearchParams({ ...values, page: String(pageNumber) });
    for (const [key, value] of [...params.entries()]) if (!value) params.delete(key);
    try {
      const response = await fetch(`/api/resources?${params}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not load resources.");
      setResources((current) => append ? [...current, ...json.resources] : json.resources); setCount(json.count); setPage(pageNumber);
      const url = new URL(window.location.href); url.search = params.toString(); url.searchParams.delete("page"); window.history.replaceState({}, "", url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load resources."); if (!append) setResources([]); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(1, filters); }, 220); return () => clearTimeout(timer); }, [filters, load]);
  const set = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const visibleSubjects = catalog.subjects.filter((s) => !filters.branch || !s.branch_id || s.branch_id === filters.branch);
  return <>
    <div className="filters">
      <input aria-label="Search resources" placeholder="Search titles, descriptions or contributors" value={filters.q} onChange={(e) => set("q", e.target.value)} />
      <select aria-label="Branch" value={filters.branch} onChange={(e) => { set("branch", e.target.value); set("subject", ""); }}><option value="">All branches</option>{catalog.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select aria-label="Subject" value={filters.subject} onChange={(e) => set("subject", e.target.value)}><option value="">All subjects</option>{visibleSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <select aria-label="Semester" value={filters.semester} onChange={(e) => set("semester", e.target.value)}><option value="">All semesters</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}</select>
      <select aria-label="Resource type" value={filters.type} onChange={(e) => set("type", e.target.value)}><option value="">All types</option>{["Notes", "PYQs", "Assignments", "Lab Manuals", "Presentations", "Reference Materials", "Other"].map((type) => <option key={type}>{type}</option>)}</select>
      <input aria-label="Academic year" placeholder="Academic year" value={filters.year} onChange={(e) => set("year", e.target.value.slice(0, 20))} />
      <select aria-label="Sort resources" value={filters.sort} onChange={(e) => set("sort", e.target.value)}><option value="newest">Newest</option><option value="popular">Most downloaded</option></select>
      <button className="button secondary" onClick={() => setFilters({ q: "", branch: "", subject: "", semester: "", type: "", year: "", sort: "newest" })}>Clear</button>
    </div>
    <p className="muted" style={{ fontSize: 12 }}>{busy ? "Loading resources…" : `${count} approved resource${count === 1 ? "" : "s"}`}</p>
    {error && <div className="notice error" role="alert">{error}</div>}
    {!resources.length && !busy && !error ? <div className="empty">No resources match those filters yet. Try clearing a filter or contribute a resource.</div> : <div className="cards">{resources.map((r) => <ResourceCard key={r.id} resource={r} />)}</div>}
    {resources.length < count && <div className="pagination"><button className="button secondary" disabled={busy} onClick={() => void load(page + 1, filters, true)}>Load more</button></div>}
  </>;
}

export function ResourceCard({ resource }: { resource: Resource }) {
  return <Link href={`/resources/${resource.id}`} className="card"><div className="inline"><span className="file-icon">PDF</span><span className="tag">{resource.resource_type}</span></div><div className="card-meta"><span>{resource.subject?.name || "Academic resource"}</span><span>Sem {resource.semester}</span></div><h3>{resource.title}</h3><p>{resource.description || `${resource.branch?.name || "Campus"} · ${resource.academic_year || "Study material"}`}</p><div className="card-foot"><span>{resource.branch?.code || resource.branch?.name || "Campus"}</span><span>{resource.download_count} downloads</span></div></Link>;
}
