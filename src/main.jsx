import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const examples = [
  "3 days in Kyoto for two people, first time, slow mornings and great food",
  "A long weekend in Lisbon with art, local restaurants, and one beach day",
  "5 days in New Zealand for hiking, scenic drives, and cozy stays"
];

const icons = { Explore: "✦", Eat: "⌁", Wander: "↗", Experience: "◌" };

function normalisePlan(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.days) || !value.days.length) {
    throw new Error("The model did not return a day-by-day itinerary.");
  }
  const days = value.days.map((day, dayIndex) => {
    if (!Array.isArray(day?.stops)) throw new Error(`Day ${dayIndex + 1} is missing its stops.`);
    return {
      day: Number(day.day) || dayIndex + 1,
      title: String(day.title || `Day ${dayIndex + 1}`),
      mood: String(day.mood || "Make it yours"),
      stops: day.stops.filter(Boolean).map((stop, stopIndex) => ({
        ...stop,
        id: String(stop.id || `${dayIndex}-${stopIndex}-${Date.now()}`),
        time: String(stop.time || "—"),
        title: String(stop.title || "Untitled stop"),
        location: String(stop.location || "On your route"),
        type: String(stop.type || "Explore"),
        duration: String(stop.duration || ""),
        note: String(stop.note || "")
      }))
    };
  });
  return { title: String(value.title || "Your trip"), summary: String(value.summary || ""), destination: String(value.destination || ""), duration: String(value.duration || ""), days };
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [dark, setDark] = useState(false);
  const requestId = useRef(0);

  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);

  async function createPlan(event) {
    event?.preventDefault();
    if (!prompt.trim() || loading) return;
    const id = ++requestId.current;
    setLoading(true); setError(""); setPlan(null);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "We couldn't create that plan.");
      if (id !== requestId.current) return;
      setPlan(normalisePlan(payload));
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Something went wrong. Please try again.");
    } finally { if (id === requestId.current) setLoading(false); }
  }

  function removeStop(dayIndex, stopId) {
    setPlan((current) => ({ ...current, days: current.days.map((day, index) => index === dayIndex ? { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) } : day) }));
  }
  function moveStop(dayIndex, stopIndex, direction) {
    setPlan((current) => {
      const days = current.days.map((day, index) => {
        if (index !== dayIndex) return day;
        const stops = [...day.stops]; const target = stopIndex + direction;
        if (target < 0 || target >= stops.length) return day;
        [stops[stopIndex], stops[target]] = [stops[target], stops[stopIndex]];
        return { ...day, stops };
      });
      return { ...current, days };
    });
  }
  function toggleStop(dayIndex, stopId) {
    const key = `${dayIndex}-${stopId}`;
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  }

  return <main className="app-shell">
    <nav className="nav"><a className="brand" href="/" aria-label="Roamwise home"><span className="brand-mark">↗</span> roamwise</a><div className="nav-actions"><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? "☼" : "☾"}</button><span className="avatar">C</span></div></nav>
    {!plan && <section className="hero">
      <div className="eyebrow"><span className="sparkle">✦</span> YOUR NEXT CHAPTER STARTS HERE</div>
      <h1>Go somewhere<br /><em>worth remembering.</em></h1>
      <p className="hero-copy">Tell us what you’re dreaming about. We’ll shape it into a trip that feels like you.</p>
      <form className="prompt-card" onSubmit={createPlan}>
        <div className="prompt-top"><span className="prompt-label">What’s on your mind?</span><span className="prompt-hint">⌘ ↵ to plan</span></div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. A slow 4-day trip to Japan with good food..." rows="3" aria-label="Describe your trip" />
        <div className="prompt-bottom"><span className="prompt-tip">✦ We’ll take it from here</span><button className="plan-button" disabled={!prompt.trim() || loading}>{loading ? <><span className="spinner" /> Planning...</> : <>Plan my trip <span>→</span></>}</button></div>
      </form>
      {error && <div className="error-box" role="alert"><span>!</span><div><strong>We hit a bump</strong><p>{error}</p><button onClick={createPlan}>Try again</button></div></div>}
      <div className="suggestions"><span>Try one of these</span>{examples.map((example) => <button key={example} onClick={() => setPrompt(example)}>{example} <span>↗</span></button>)}</div>
      <div className="trust-row"><span>✦</span> Thoughtful plans, not cookie-cutter itineraries <i /> <span>◌</span> Built for curious people
      </div>
    </section>}
    {loading && !plan && <div className="loading-state"><div className="loading-orbit">✦</div><h2>Putting the pieces together...</h2><p>Finding the places that make a trip feel like yours.</p></div>}
    {plan && <section className="plan-page">
      <div className="plan-heading"><button className="back-button" onClick={() => setPlan(null)}>← Start over</button><div className="plan-meta"><span>{plan.destination}</span><i /> <span>{plan.duration}</span></div><h1>{plan.title}</h1><p>{plan.summary}</p><button className="edit-button" onClick={() => setPrompt(`Make this itinerary better: ${plan.title}`)}>✦ Refine with AI</button></div>
      <div className="timeline">{plan.days.map((day, dayIndex) => <article className="day-card" key={`${day.day}-${day.title}`}><div className="day-header"><div className="day-number">0{day.day}</div><div><h2>{day.title}</h2><p>{day.mood}</p></div><span className="day-count">{day.stops.length} stops</span></div><div className="stops">{day.stops.length ? day.stops.map((stop, stopIndex) => { const key = `${dayIndex}-${stop.id}`; return <div className={`stop ${expanded[key] ? "is-expanded" : ""}`} key={stop.id}><div className="stop-line"><span className="stop-time">{stop.time}</span><span className="stop-dot">{icons[stop.type] || "✦"}</span><button className="stop-main" onClick={() => toggleStop(dayIndex, stop.id)}><strong>{stop.title}</strong><small>{stop.location} <i /> {stop.duration}</small></button><button className="remove-button" onClick={() => removeStop(dayIndex, stop.id)} aria-label={`Remove ${stop.title}`}>×</button></div>{expanded[key] && <div className="stop-detail"><p>{stop.note}</p><div className="reorder"><button onClick={() => moveStop(dayIndex, stopIndex, -1)} disabled={stopIndex === 0}>↑ Move up</button><button onClick={() => moveStop(dayIndex, stopIndex, 1)} disabled={stopIndex === day.stops.length - 1}>↓ Move down</button></div></div>}</div> }) : <p className="empty-day">No stops left. Add a refinement to rebuild this day.</p>}</div></article>)}</div>
      <button className="new-plan" onClick={() => { setPlan(null); setPrompt(""); }}>+ Plan another trip</button>
    </section>}
    <footer>ROAMWISE <span>·</span> Make room for the unexpected.</footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
