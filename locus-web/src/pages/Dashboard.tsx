import { motion } from "framer-motion";
import { DashboardLayout } from "../components/DashboardLayout";

const stats = [
  { label: "Active Tokens", value: "1", change: "Starter plan" },
  { label: "API Requests", value: "0", change: "This month" },
  { label: "Agent Runs", value: "0", change: "Total" },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em]">Welcome back</h1>
          <p className="mt-1 text-xs sm:text-sm text-black/40">Here's what's happening with your Locus account.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-3">
              <p className="text-[10px] sm:text-xs text-black/40">{stat.label}</p>
              <p className="mt-0.5 text-lg sm:text-2xl font-bold text-black">{stat.value}</p>
              <p className="mt-0.5 text-[10px] sm:text-xs text-black/30">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-black mb-4">Quick Start</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-black/80 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-medium text-black">Request a token</p>
                <p className="text-xs text-black/40 mt-0.5">Get your API token to authenticate the Locus agent.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-black/80 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-medium text-black">Install Locus CLI</p>
                <p className="text-xs text-black/40 mt-0.5">
                  Run <code className="text-[11px] bg-black/5 px-1.5 py-0.5 rounded font-mono">npm i -g @locus/cli</code> in your terminal.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-black/80 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-medium text-black">Start coding</p>
                <p className="text-xs text-black/40 mt-0.5">
                  Run <code className="text-[11px] bg-black/5 px-1.5 py-0.5 rounded font-mono">locus init</code> and start building.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
