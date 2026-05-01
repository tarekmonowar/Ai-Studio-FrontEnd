"use client";

import { useState, useRef } from "react";
import {
  Database,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Zap,
  Layers,
  Brain,
} from "lucide-react";
import { resolveBackendHttpUrl } from "@/config/runtime";

/* ─────────────────────── Types ─────────────────────── */

interface QueryResult {
  content: string;
  similarity: number;
}

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

/* ─────────────────────── Component ─────────────────────── */

export function AnalyticalAIPanel() {
  /* ── Store Section State ── */
  const [storeText, setStoreText] = useState("");
  const [isStoring, setIsStoring] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StatusMessage | null>(null);

  /* ── Query Section State ── */
  const [queryText, setQueryText] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [hasQueried, setHasQueried] = useState(false);

  const queryInputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Store Handler ── */
  const handleStore = async () => {
    if (!storeText.trim()) return;

    setIsStoring(true);
    setStoreStatus(null);

    try {
      const res = await fetch(`${resolveBackendHttpUrl()}/ai/vector/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: storeText.trim() }),
      });

      const data = await res.json();

      if (data.ok) {
        setStoreStatus({
          type: "success",
          text: "Embedding created & stored in Supabase vector database.",
        });
        setStoreText("");
      } else {
        setStoreStatus({
          type: "error",
          text: data.message || "Failed to store embedding.",
        });
      }
    } catch {
      setStoreStatus({
        type: "error",
        text: "Network error. Please check your connection.",
      });
    } finally {
      setIsStoring(false);
    }
  };

  /* ── Query Handler ── */
  const handleQuery = async () => {
    if (!queryText.trim()) return;

    setIsQuerying(true);
    setQueryError(null);
    setQueryResults([]);
    setHasQueried(true);

    try {
      const res = await fetch(`${resolveBackendHttpUrl()}/ai/vector/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText.trim() }),
      });

      const data = await res.json();

      if (data.ok) {
        setQueryResults(data.results || []);
      } else {
        setQueryError(data.message || "Query failed.");
      }
    } catch {
      setQueryError("Network error. Please check your connection.");
    } finally {
      setIsQuerying(false);
    }
  };

  /* ── Similarity badge color ── */
  const getSimilarityColor = (sim: number) => {
    if (sim >= 0.8) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (sim >= 0.5) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
    if (sim >= 0.3) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  };

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <main className="px-4 pb-32 pt-3 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* ── Page Header ── */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
            Vector Embedding{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
              Pipeline
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Store text as vector embeddings in Supabase and retrieve
            semantically similar results using cosine similarity search.
          </p>
        </div>

        {/* ── Architecture Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Brain,
              title: "Embedding Model",
              desc: "text-embedding-3-large",
              color: "from-fuchsia-500/20 to-purple-500/10",
              iconColor: "text-fuchsia-400",
              borderColor: "border-fuchsia-500/20",
            },
            {
              icon: Database,
              title: "Vector Database",
              desc: "Supabase pgvector",
              color: "from-emerald-500/20 to-teal-500/10",
              iconColor: "text-emerald-400",
              borderColor: "border-emerald-500/20",
            },
            {
              icon: Zap,
              title: "Similarity Search",
              desc: "Cosine via match_documents",
              color: "from-amber-500/20 to-orange-500/10",
              iconColor: "text-amber-400",
              borderColor: "border-amber-500/20",
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-4 backdrop-blur`}
            >
              <card.icon className={`h-5 w-5 ${card.iconColor} mb-2`} />
              <p className="text-sm font-semibold text-slate-200">
                {card.title}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Pipeline Flow Indicator ── */}
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500">
          <span className="flex items-center gap-1 text-cyan-400">
            <Layers className="h-3.5 w-3.5" /> Text Input
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="flex items-center gap-1 text-fuchsia-400">
            <Sparkles className="h-3.5 w-3.5" /> OpenAI Embedding
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="flex items-center gap-1 text-emerald-400">
            <Database className="h-3.5 w-3.5" /> Supabase Vector
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="flex items-center gap-1 text-amber-400">
            <Search className="h-3.5 w-3.5" /> Similarity Match
          </span>
        </div>

        {/* ── Two-Panel Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ═══════════════════ STORE PANEL ═══════════════════ */}
          <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 backdrop-blur overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div className="h-9 w-9 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                <Upload className="h-4.5 w-4.5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Store Embedding
                </h2>
                <p className="text-xs text-slate-400">
                  Text → OpenAI Embedding → Supabase pgvector
                </p>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="store-input"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Text content to embed
                </label>
                <textarea
                  id="store-input"
                  value={storeText}
                  onChange={(e) => setStoreText(e.target.value)}
                  placeholder="Paste or type any text to store as a vector embedding..."
                  rows={5}
                  className="w-full rounded-xl border border-cyan-500/20 bg-slate-800/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 resize-none transition-all"
                />
              </div>

              <button
                onClick={handleStore}
                disabled={isStoring || !storeText.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-semibold py-3 px-4 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40"
              >
                {isStoring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating embedding...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Embed & Store in Vector DB
                  </>
                )}
              </button>

              {/* Status Message */}
              {storeStatus && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
                    storeStatus.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {storeStatus.type === "success" ? (
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  )}
                  <span>{storeStatus.text}</span>
                </div>
              )}

              {/* How it works */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  How it works
                </p>
                <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                  <li>
                    Your text is sent to{" "}
                    <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                      text-embedding-3-large
                    </code>
                  </li>
                  <li>
                    OpenAI returns a{" "}
                    <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                      1536-dimension
                    </code>{" "}
                    float vector
                  </li>
                  <li>
                    Vector + content stored in Supabase{" "}
                    <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                      pgvector
                    </code>{" "}
                    table
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* ═══════════════════ QUERY PANEL ═══════════════════ */}
          <section className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-teal-500/15 bg-gradient-to-r from-teal-500/10 to-transparent">
              <div className="h-9 w-9 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                <Search className="h-4.5 w-4.5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Semantic Search
                </h2>
                <p className="text-xs text-slate-400">
                  Query → Embedding → Cosine Similarity → Results
                </p>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-5 space-y-4 flex-1 flex flex-col">
              <div>
                <label
                  htmlFor="query-input"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Semantic search query
                </label>
                <textarea
                  id="query-input"
                  ref={queryInputRef}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleQuery();
                    }
                  }}
                  placeholder="Describe what you're looking for..."
                  rows={3}
                  className="w-full rounded-xl border border-teal-500/20 bg-slate-800/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 resize-none transition-all"
                />
              </div>

              <button
                onClick={handleQuery}
                disabled={isQuerying || !queryText.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 text-white font-semibold py-3 px-4 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-teal-900/30 hover:shadow-teal-800/40"
              >
                {isQuerying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching vector space...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Vector Database
                  </>
                )}
              </button>

              {/* Results */}
              <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto">
                {queryError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-300">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <span>{queryError}</span>
                  </div>
                )}

                {hasQueried && !isQuerying && queryResults.length === 0 && !queryError && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No matching documents found.</p>
                    <p className="text-xs mt-1">
                      Try storing some text first, then search for related
                      content.
                    </p>
                  </div>
                )}

                {queryResults.map((result, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-2 hover:border-teal-500/25 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Match #{index + 1}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${getSimilarityColor(result.similarity)}`}
                      >
                        {(result.similarity * 100).toFixed(1)}% match
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {result.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
