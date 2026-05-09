import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "../components/DashboardLayout";

interface RequestItem {
  id: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  token: string;
  plan: string;
  email: string;
}

const mockRequests: RequestItem[] = [
  { id: "REQ-001", date: "May 01, 2026", status: "approved", token: "locus_sk_a1b2c3...x9y8", plan: "Starter", email: "guest@locus.dev" },
];

const statusStyles: Record<RequestItem["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function Requests() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("starter");
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setShowModal(false);
      setName("");
      setEmail("");
      setPlan("starter");
    }, 2000);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em]">Token Requests</h1>
            <p className="mt-1 text-xs sm:text-sm text-black/40">Request and manage your Locus AI agent tokens.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-all hover:bg-black/90 active:scale-[0.98] shrink-0"
          >
            New Request
          </button>
        </div>

        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-md"
                onClick={() => setShowModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-sm glass-card rounded-2xl p-5 sm:p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-black">Request Token</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                  >
                    <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-black/60 mb-1.5">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                      placeholder="John Doe"
                      className={`w-full bg-white/50 border rounded-xl px-3.5 py-2.5 text-sm text-black placeholder:text-black/20 outline-none transition-all ${
                        focused === "name"
                          ? "border-black/20 bg-white/70 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                          : "border-black/8"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-black/60 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="you@example.com"
                      className={`w-full bg-white/50 border rounded-xl px-3.5 py-2.5 text-sm text-black placeholder:text-black/20 outline-none transition-all ${
                        focused === "email"
                          ? "border-black/20 bg-white/70 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                          : "border-black/8"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-black/60 mb-1.5">Plan</label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full bg-white/50 border border-black/8 rounded-xl px-3.5 py-2.5 text-sm text-black outline-none appearance-none cursor-pointer"
                    >
                      <option value="starter">Starter — $7/mo</option>
                      <option value="pro">Pro — $19/mo</option>
                      <option value="enterprise">Enterprise — Custom</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-black/90 active:scale-[0.98]"
                  >
                    {submitted ? "Submitted!" : "Submit Request"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {mockRequests.map((req) => (
            <div key={req.id} className="glass-card rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-medium text-black">{req.id}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyles[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-black/40">{req.date} · {req.plan}</p>
                </div>
                {req.status === "approved" && (
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-black/5 px-2 py-1.5 rounded text-black/60 truncate max-w-[140px] sm:max-w-none">
                      {req.token}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(req.token)}
                      className="text-xs text-black/40 hover:text-black transition-colors shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
