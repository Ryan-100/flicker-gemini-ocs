import { useState } from 'react'
import { api } from '../api'
import {
    Send, CheckCircle2, XCircle, Clock, FileEdit,
    ClipboardList, RefreshCw, ChevronRight, X, Inbox
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_META = {
    Draft:     { color: 'text-slate-300 bg-slate-700/60 border-slate-600/50',  icon: <FileEdit   className="w-3 h-3" /> },
    Submitted: { color: 'text-sky-300  bg-sky-900/40   border-sky-700/40',    icon: <Clock      className="w-3 h-3" /> },
    Approved:  { color: 'text-emerald-300 bg-emerald-900/40 border-emerald-700/40', icon: <CheckCircle2 className="w-3 h-3" /> },
    Rejected:  { color: 'text-red-300  bg-red-900/40   border-red-700/40',    icon: <XCircle    className="w-3 h-3" /> },
    Revised:   { color: 'text-amber-300 bg-amber-900/40 border-amber-700/40', icon: <RefreshCw  className="w-3 h-3" /> },
}

function StatusBadge({ status }) {
    const meta = STATUS_META[status] || { color: 'text-slate-300 bg-slate-700/60 border-slate-600', icon: null }
    return (
        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${meta.color}`}>
            {meta.icon}
            <span>{status}</span>
        </span>
    )
}

// Submission confirmation modal
function SubmitModal({ plan, onConfirm, onCancel, submitting }) {
    const [notes, setNotes] = useState('')
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.92, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">Submit for Validation</h3>
                        <p className="text-slate-400 text-sm mt-1">Plan: <span className="font-semibold text-slate-200">{plan.target.name}</span></p>
                    </div>
                    <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Submission Notes <span className="text-slate-600 normal-case font-normal">(optional)</span>
                    </label>
                    <textarea
                        rows={4}
                        placeholder="Add any context, special requirements, or notes for the Science Observer reviewing this plan..."
                        className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
                    <p className="text-indigo-300 text-sm font-medium">
                        Once submitted, the plan will enter the Science Observer validation queue and its status will change to <strong>Submitted</strong>.
                    </p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(notes)}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {submitting
                            ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Submitting...</span></>
                            : <><Send className="w-4 h-4" /><span>Confirm Submission</span></>
                        }
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

function Dashboard({ plans, onRefresh, onValidate, loading, userRole, toast }) {
    const [pendingSubmit, setPendingSubmit] = useState(null) // plan being submitted
    const [submitting, setSubmitting] = useState(false)

    const handleSubmitPlan = async (plan) => {
        setPendingSubmit(plan)
    }

    const confirmSubmit = async (notes) => {
        setSubmitting(true)
        try {
            await api.submitPlan(pendingSubmit.id, notes || '')
            setPendingSubmit(null)
            toast.success(`"${pendingSubmit.target.name}" submitted for validation.`)
            onRefresh()
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit plan. Please try again.'
            toast.error(msg)
        } finally {
            setSubmitting(false)
        }
    }

    const statCounts = {
        draft:     plans.filter(p => p.status === 'Draft').length,
        submitted: plans.filter(p => p.status === 'Submitted').length,
        approved:  plans.filter(p => p.status === 'Approved').length,
        rejected:  plans.filter(p => p.status === 'Rejected').length,
    }

    return (
        <>
            <AnimatePresence>
                {pendingSubmit && (
                    <SubmitModal
                        plan={pendingSubmit}
                        onConfirm={confirmSubmit}
                        onCancel={() => { if (!submitting) setPendingSubmit(null) }}
                        submitting={submitting}
                    />
                )}
            </AnimatePresence>

            <div className="space-y-8">
                {/* Header */}
                <header className="bg-slate-900/60 backdrop-blur border border-white/5 rounded-2xl p-8">
                    <div className="flex flex-wrap justify-between items-start gap-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                                {userRole === 'Science Observer' ? 'Validation Queue' : 'My Science Plans'}
                            </h1>
                            <p className="text-slate-400 mt-1 text-base">
                                {userRole === 'Science Observer'
                                    ? 'Review and validate submitted observation plans'
                                    : 'Manage and monitor your Gemini OCS observation plans'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {[
                                { label: 'Draft',     count: statCounts.draft,     color: 'text-slate-300 bg-slate-800 border-slate-700' },
                                { label: 'Pending',   count: statCounts.submitted,  color: 'text-sky-300 bg-sky-900/40 border-sky-700/40' },
                                { label: 'Approved',  count: statCounts.approved,  color: 'text-emerald-300 bg-emerald-900/40 border-emerald-700/40' },
                                { label: 'Rejected',  count: statCounts.rejected,  color: 'text-red-300 bg-red-900/40 border-red-700/40' },
                            ].map(s => (
                                <div key={s.label} className={`text-center px-5 py-2 rounded-xl border ${s.color}`}>
                                    <div className="text-xl font-black">{s.count}</div>
                                    <div className="text-[10px] uppercase tracking-widest font-semibold opacity-70">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 animate-pulse space-y-4">
                                <div className="h-5 bg-slate-700/60 rounded-full w-1/3" />
                                <div className="h-7 bg-slate-700/60 rounded-xl w-3/4" />
                                <div className="h-4 bg-slate-700/40 rounded-full w-1/2" />
                                <div className="h-12 bg-slate-700/30 rounded-xl mt-6" />
                            </div>
                        ))}
                    </div>
                ) : plans.length === 0 ? (
                    <div className="bg-slate-900/40 border-2 border-dashed border-white/10 rounded-2xl p-20 text-center">
                        {userRole === 'Science Observer'
                            ? <Inbox className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            : <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        }
                        <h3 className="text-xl font-bold text-slate-400">
                            {userRole === 'Science Observer' ? 'Validation queue is empty' : 'No plans found'}
                        </h3>
                        <p className="text-slate-500 mt-2 text-sm">
                            {userRole === 'Science Observer'
                                ? 'No submitted plans are awaiting validation right now.'
                                : 'Create your first science plan to get started.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-slate-900/60 backdrop-blur border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 hover:bg-slate-900/80 transition duration-300 group flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-5">
                                    <StatusBadge status={plan.status} />
                                    <span className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">{plan.id.slice(0, 8)}</span>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition truncate">
                                    {plan.target.name}
                                </h3>
                                <p className="text-slate-500 text-sm font-medium mb-5">by {plan.astronomer_id}</p>

                                <div className="space-y-2 mb-6 flex-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Coordinates</span>
                                        <span className="text-slate-300 font-mono text-xs">{plan.target.ra}, {plan.target.dec}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Total Exp.</span>
                                        <span className="text-slate-300">{(plan.exposure.exp_time * plan.exposure.num_exposures / 60).toFixed(1)} min</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">File Format</span>
                                        <span className="text-slate-300 font-mono">{plan.data_proc.file_type}</span>
                                    </div>
                                </div>

                                {/* Role-gated action buttons */}
                                {userRole === 'Astronomer' && (plan.status === 'Draft' || plan.status === 'Revised') && (
                                    <button
                                        onClick={() => handleSubmitPlan(plan)}
                                        className="w-full py-3 rounded-xl font-bold flex justify-center items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 transition"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Submit for Review</span>
                                    </button>
                                )}

                                {userRole === 'Science Observer' && plan.status === 'Submitted' && (
                                    <button
                                        onClick={() => onValidate(plan.id)}
                                        className="w-full py-3 rounded-xl font-bold flex justify-center items-center space-x-2 bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 transition"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                        <span>Review & Validate</span>
                                    </button>
                                )}

                                {(plan.status === 'Approved' || plan.status === 'Rejected') && (
                                    <div className={`w-full py-3 rounded-xl text-center text-sm font-bold border ${plan.status === 'Approved' ? 'text-emerald-400 border-emerald-700/30 bg-emerald-900/10' : 'text-red-400 border-red-700/30 bg-red-900/10'}`}>
                                        {plan.status === 'Approved' ? '✓ Approved for Observation' : '✗ Rejected — Revision Required'}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}

export default Dashboard
