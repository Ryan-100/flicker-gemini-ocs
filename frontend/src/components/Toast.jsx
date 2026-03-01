import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)

const ICONS = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error:   <XCircle     className="w-5 h-5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info:    <Info         className="w-5 h-5 text-blue-400 shrink-0" />,
}

const BORDER = {
    success: 'border-emerald-500/30',
    error:   'border-red-500/30',
    warning: 'border-amber-500/30',
    info:    'border-blue-500/30',
}

function ToastItem({ toast, onRemove }) {
    useEffect(() => {
        const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000)
        return () => clearTimeout(t)
    }, [toast.id, toast.duration, onRemove])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 80, scale: 0.92 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`flex items-start space-x-3 bg-slate-900/95 backdrop-blur-xl border ${BORDER[toast.type]} rounded-2xl px-5 py-4 shadow-2xl max-w-sm w-full`}
        >
            {ICONS[toast.type]}
            <p className="text-sm text-slate-200 font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-slate-500 hover:text-slate-300 transition mt-0.5 shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    )
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

    const add = useCallback((type, message, duration) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev.slice(-4), { id, type, message, duration }])
    }, [])

    const toast = {
        success: (msg, dur) => add('success', msg, dur),
        error:   (msg, dur) => add('error',   msg, dur),
        warning: (msg, dur) => add('warning', msg, dur),
        info:    (msg, dur) => add('info',    msg, dur),
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map(t => (
                        <div key={t.id} className="pointer-events-auto">
                            <ToastItem toast={t} onRemove={remove} />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used inside ToastProvider')
    return ctx
}
