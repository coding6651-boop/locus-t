import { motion } from "framer-motion";
import { DashboardLayout } from "../components/DashboardLayout";

export default function Account() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-lg sm:text-xl font-semibold text-black tracking-[-0.02em] mb-6">Account</h1>

        <div className="glass-card rounded-xl p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[10px] sm:text-xs text-black/40 mb-1">Email</p>
            <p className="text-sm text-black">user@example.com</p>
          </div>
          <div className="border-t border-black/5" />
          <div>
            <p className="text-[10px] sm:text-xs text-black/40 mb-1">Plan</p>
            <p className="text-sm text-black">Starter</p>
          </div>
          <div className="border-t border-black/5" />
          <div>
            <p className="text-[10px] sm:text-xs text-black/40 mb-1">License Status</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-sm text-black">Active</span>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
