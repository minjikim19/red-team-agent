import { Shield, Activity } from "lucide-react";

interface HeaderProps {
  queuedCount: number;
  totalGenerated: number;
}

export default function Header({ queuedCount, totalGenerated }: HeaderProps) {
  return (
    <header className="border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white tracking-tight">
              Risk Governance Engine
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {totalGenerated > 0 && (
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>
                  <span className="text-white font-medium">{totalGenerated}</span> scenarios generated
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>
                  <span className="text-cyan-400 font-medium">{queuedCount}</span> queued for validation
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-surface-700 bg-surface-800">
            <span className="text-xs text-slate-400 font-mono">FinVault Security</span>
          </div>
        </div>
      </div>
    </header>
  );
}
