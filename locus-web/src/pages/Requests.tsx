import { motion } from "framer-motion";
import { DashboardLayout } from "../components/DashboardLayout";

export default function Requests() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em] mb-6">Requests</h1>
        <div className="glass-card rounded-xl p-6 sm:p-8 text-center">
          <p className="text-xs sm:text-sm text-black/40">No requests yet.</p>
          <p className="text-xs text-black/30 mt-1">Your API requests will appear here once you start using Locus.</p>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
