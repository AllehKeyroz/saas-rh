import { AlertTriangle } from 'lucide-react'

export default function StubBadge({ nome, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 font-medium">
          ⚠️ <strong>{nome}</strong> — módulo em construção. Em breve disponível.
        </p>
      </div>
      {children}
    </div>
  )
}
