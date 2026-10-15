"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!file) { setError("Choose a PDF file first."); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Only PDF files are supported."); return; }
    if (file.size > (Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES) || 10 * 1024 * 1024)) { setError("The PDF is larger than the upload limit."); return; }
    setBusy(true); setProgress(8);
    const data = new FormData(event.currentTarget); data.set("file", file);
    try {
      const xhr = new XMLHttpRequest();
      const result = await new Promise<{ reference: string }>((resolve, reject) => {
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.max(8, Math.round(e.loaded / e.total * 90))); };
        xhr.onload = () => { let json: { reference?: string; error?: string } = {}; try { json = JSON.parse(xhr.responseText); } catch { /* handled below */ } if (xhr.status < 200 || xhr.status >= 300) reject(new Error(json.error || `Upload failed (HTTP ${xhr.status}).`)); else if (!json.reference) reject(new Error("Upload completed without a submission reference.")); else resolve(json as { reference: string }); };
        xhr.onerror = () => reject(new Error("Network error. Please retry.")); xhr.send(data);
      });
      setProgress(100); router.push(`/submission/${encodeURIComponent(result.reference)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed. Please retry."); setBusy(false); }
  }
  return <form className="form-card" onSubmit={submit}>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="form-grid">
      <div className="field wide"><label htmlFor="title">Resource title *</label><input id="title" name="title" required minLength={3} maxLength={160} placeholder="e.g. Data Structures — Unit 2 Notes" /></div>
      <div className="field"><label htmlFor="branchName">Branch *</label><input id="branchName" name="branchName" required minLength={2} maxLength={120} placeholder="e.g. Computer Science and Engineering" /></div>
      <div className="field"><label htmlFor="semester">Semester *</label><select id="semester" name="semester" required defaultValue=""><option value="">Choose semester</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}</select></div>
      <div className="field"><label htmlFor="subjectName">Subject *</label><input id="subjectName" name="subjectName" required minLength={2} maxLength={150} placeholder="e.g. Data Structures" /></div>
      <div className="field"><label htmlFor="resourceType">Resource type *</label><select id="resourceType" name="resourceType" required defaultValue=""><option value="">Choose type</option>{["Notes", "PYQs", "Assignments", "Lab Manuals", "Presentations", "Reference Materials", "Other"].map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="field"><label htmlFor="academicYear">Academic year</label><input id="academicYear" name="academicYear" placeholder="2025-2026" maxLength={20} /></div>
      <div className="field"><label htmlFor="contributorName">Contributor name (optional)</label><input id="contributorName" name="contributorName" maxLength={80} placeholder="Guest Contributor" /></div>
      <div className="field wide"><label htmlFor="description">Description (optional)</label><textarea id="description" name="description" maxLength={2000} placeholder="Add a short description to help students find this resource." /></div>
      <div className="field wide"><label htmlFor="file">PDF file * · Up to {Math.round((Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES) || 10 * 1024 * 1024) / 1024 / 1024)} MB</label><div className="file-drop">PDF documents only. Files are reviewed before publication.<input id="file" type="file" accept="application/pdf,.pdf" required onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>{busy && <progress value={progress} max="100" style={{ width: "100%" }} />}</div>
    </div>
    <button className="button" type="submit" disabled={busy}>{busy ? `Uploading ${progress}%…` : "Submit for review"}</button><p className="muted" style={{ fontSize: 11, lineHeight: 1.6 }}>Your file stays private until a moderator approves it. No account, email, or phone number is needed.</p>
  </form>;
}
