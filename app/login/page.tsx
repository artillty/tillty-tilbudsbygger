"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const d = await r.json().catch(() => ({}));
        setErr(d.error || "Forkert kodeord");
        setBusy(false);
      }
    } catch {
      setErr("Kunne ikke få fat i serveren");
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <form className="gate-in" onSubmit={submit}>
        <h1>tillty</h1>
        <p className="und">Tilbudsbygger · internt værktøj</p>
        <label htmlFor="pw">Kodeord</label>
        <input
          id="pw"
          type="password"
          value={pw}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="gate-err">{err}</p>}
        <button className="btn" type="submit" disabled={busy || !pw}>
          {busy ? "Åbner…" : "Luk op"}
        </button>
      </form>
    </div>
  );
}
