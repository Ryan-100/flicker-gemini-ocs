import { useState, useEffect } from 'react'
import {
    CheckCircle, XCircle, ChevronLeft, AlertTriangle,
    Camera, Target as TargetIcon, Wind, Clock, FileText, CheckCircle2
} from 'lucide-react'
import { api } from '../api'
import { motion, AnimatePresence } from 'framer-motion'

const REJECTION_CATEGORIES = [
    "Technical Infeasibility",
    "Scientific Merit Issues",
    "Scheduling Conflict",
    "Incomplete Information",
    "Observing Conditions Unrealistic",
    "Data Specification Issues",
    "Instrument Configuration Problem",
    "Other",
]

/* ─── Approval Confirmation Dialog ─── */
function ApprovalConfirmDialog({ plan, onConfirm, onCancel, loading }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.9, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 16 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Confirm Approval</h3>
                    <p className="text-slate-400 text-sm mt-2">
                        You are about to approve <span className="font-semibold text-slate-200">"{plan.target.name}"</span>.
                        This will make the plan eligible for conversion to an Observing Program.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 transition text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition text-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {loading
                            ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Approving...</span></>
                            : <><CheckCircle2 className="w-4 h-4" /><span>Confirm Approval</span></>
                        }
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

/* ─── Helpers ─── */
function DetailRow({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className="text-slate-200 text-sm font-semibold">{value ?? '—'}</span>
        </div>
    )
}

function SectionCard({ icon: Icon, title, children, accent = 'indigo' }) {
    const colors = {
        indigo: 'text-indigo-400 bg-indigo-900/20 border-indigo-500/20',
        sky:    'text-sky-400 bg-sky-900/20 border-sky-500/20',
        violet: 'text-violet-400 bg-violet-900/20 border-violet-500/20',
        amber:  'text-amber-400 bg-amber-900/20 border-amber-500/20',
    }
    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
            <h3 className={`flex items-center space-x-2 text-xs font-bold uppercase tracking-widest mb-4 ${colors[accent].split(' ')[0]}`}>
                <Icon className="w-4 h-4" />
                <span>{title}</span>
            </h3>
            {children}
        </div>
    )
}

/* ─── Main Component ─── */
function ValidationView({ planId, onSuccess, onCancel, toast }) {
    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isRejecting, setIsRejecting] = useState(false)
    const [showApproveConfirm, setShowApproveConfirm] = useState(false)
    const [category, setCategory] = useState(REJECTION_CATEGORIES[0])
    const [reason, setReason] = useState('')
    const [rejectError, setRejectError] = useState('')
    const [validating, setValidating] = useState(false)

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const data = await api.getPlan(planId)
                setPlan(data)
            } catch {
                toast.error('Failed to load plan details.')
            } finally {
                setLoading(false)
            }
        }
        fetchPlan()
    }, [planId])

    const handleApprove = async () => {
        setValidating(true)
        try {
            await api.validatePlan(planId, true, null, null)
            toast.success(`Plan "${plan.target.name}" approved for observation!`)
            onSuccess()
        } catch (err) {
            const msg = err.response?.data?.message || 'Could not approve plan. Please try again.'
            toast.error(msg)
            setShowApproveConfirm(false)
        } finally {
            setValidating(false)
        }
    }

    const handleReject = async () => {
        if (reason.trim().length < 50) {
            setRejectError(`Rejection reason must be at least 50 characters (currently ${reason.trim().length}).`)
            return
        }
        setRejectError('')
        setValidating(true)
        try {
            await api.validatePlan(planId, false, category, reason)
            toast.success(`Plan rejected. Astronomer has been notified with your feedback.`)
            onSuccess()
        } catch (err) {
            const msg = err.response?.data?.message || 'Could not reject plan. Please try again.'
            toast.error(msg)
        } finally {
            setValidating(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="h-8 w-32 bg-slate-800 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="bg-slate-900/40 rounded-2xl h-48 animate-pulse border border-white/5" />)}
                    </div>
                    <div className="bg-slate-900/40 rounded-2xl h-80 animate-pulse border border-white/5" />
                </div>
            </div>
        )
    }

    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <XCircle className="w-16 h-16 text-red-500/40 mb-4" />
                <h3 className="text-xl font-bold text-slate-300">Plan Not Found</h3>
                <p className="text-slate-500 mt-2 text-sm">The requested science plan could not be loaded.</p>
                <button onClick={onCancel} className="mt-6 px-6 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition text-sm font-bold">
                    Back to Queue
                </button>
            </div>
        )
    }

    const totalMin = ((plan.exposure.exp_time * plan.exposure.num_exposures) / 60).toFixed(1)

    return (
        <>
            <AnimatePresence>
                {showApproveConfirm && (
                    <ApprovalConfirmDialog
                        plan={plan}
                        onConfirm={handleApprove}
                        onCancel={() => { if (!validating) setShowApproveConfirm(false) }}
                        loading={validating}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto pb-10">
                <button
                    onClick={onCancel}
                    className="flex items-center space-x-2 text-slate-500 hover:text-slate-200 mb-8 transition font-semibold text-sm group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                    <span>Back to Validation Queue</span>
                </button>

                {/* Page header */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-8 mb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">{plan.target.name}</h1>
                            <p className="text-slate-400 mt-1 text-sm">
                                Submitted by <span className="text-slate-200 font-semibold">{plan.astronomer_id}</span>
                                {' '}&nbsp;·&nbsp;&nbsp;{new Date(plan.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 bg-sky-900/30 border border-sky-500/30 px-4 py-2 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                            <span className="text-sky-300 text-sm font-bold uppercase tracking-wider">Pending Validation</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Plan Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <SectionCard icon={TargetIcon} title="Target &amp; Conditions" accent="indigo">
                            <div className="grid grid-cols-2 gap-x-8">
                                <div>
                                    <DetailRow label="Object Name"   value={plan.target.name} />
                                    <DetailRow label="Object Type"   value={plan.target.object_type || '—'} />
                                    <DetailRow label="RA"            value={plan.target.ra} />
                                    <DetailRow label="Declination"   value={plan.target.dec} />
                                    <DetailRow label="Magnitude"     value={plan.target.magnitude} />
                                </div>
                                <div>
                                    <DetailRow label="Seeing Req."   value={`${plan.conditions.seeing} arcsec`} />
                                    <DetailRow label="Cloud Cover"   value={`${plan.conditions.cloud_cover}%`} />
                                    <DetailRow label="Water Vapor"   value={`${plan.conditions.water_vapor}%`} />
                                    <DetailRow label="Instrument"    value={plan.instrument || '—'} />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard icon={Clock} title="Exposure &amp; Filters" accent="sky">
                            <div className="grid grid-cols-2 gap-x-8">
                                <div>
                                    <DetailRow label="Exposure Time"   value={`${plan.exposure.exp_time}s`} />
                                    <DetailRow label="Num Exposures"   value={plan.exposure.num_exposures} />
                                    <DetailRow label="Total Obs. Time" value={`${totalMin} min`} />
                                </div>
                                <div>
                                    <DetailRow label="Filters" value={(plan.exposure.filters || []).join(', ') || '—'} />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard icon={Camera} title="Data Specifications (Gemini Standard)" accent="violet">
                            <div className="grid grid-cols-2 gap-x-8 mb-4">
                                <div>
                                    <DetailRow label="File Type"     value={plan.data_proc.file_type} />
                                    <DetailRow label="File Quality"  value={plan.data_proc.file_quality || '—'} />
                                    <DetailRow label="Color Mode"    value={plan.data_proc.image_proc.color_mode} />
                                </div>
                                <div>
                                    <DetailRow label="Contrast"      value={`${plan.data_proc.image_proc.contrast}%`} />
                                    <DetailRow label="Brightness"    value={`${plan.data_proc.image_proc.brightness}%`} />
                                    <DetailRow label="Saturation"    value={`${plan.data_proc.image_proc.saturation}%`} />
                                </div>
                            </div>
                        </SectionCard>

                        {plan.submission_notes && (
                            <SectionCard icon={FileText} title="Astronomer's Submission Notes" accent="amber">
                                <p className="text-slate-300 text-sm leading-relaxed italic">
                                    "{plan.submission_notes}"
                                </p>
                            </SectionCard>
                        )}
                    </div>

                    {/* Right: Validation Panel */}
                    <div>
                        <div className={`bg-slate-900/60 border rounded-2xl p-6 sticky top-24 transition-all duration-500 ${isRejecting ? 'border-red-500/40' : 'border-emerald-500/30'}`}>
                            <h2 className="text-base font-bold text-white mb-1">Validation Decision</h2>
                            <p className="text-slate-500 text-xs mb-6">Review all plan sections before making your decision.</p>

                            {!isRejecting ? (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setShowApproveConfirm(true)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 transition text-sm"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Approve Plan</span>
                                    </button>
                                    <button
                                        onClick={() => setIsRejecting(true)}
                                        className="w-full bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition text-sm"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span>Reject Plan</span>
                                    </button>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-5"
                                >
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rejection Category</label>
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="w-full bg-slate-800/60 border border-white/8 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition"
                                        >
                                            {REJECTION_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detailed Reason</label>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reason.trim().length >= 50 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                                                {reason.trim().length}/50
                                            </span>
                                        </div>
                                        <textarea
                                            rows={6}
                                            placeholder="Provide specific, actionable feedback. Describe the issue, which aspect is problematic, and how the astronomer can revise the plan. (minimum 50 characters)"
                                            className={`w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 transition resize-none ${rejectError ? 'border-red-500/50 focus:ring-red-500/40' : 'border-white/8 focus:ring-red-500/30'}`}
                                            value={reason}
                                            onChange={e => { setReason(e.target.value); if (rejectError) setRejectError('') }}
                                        />

                                        {/* Inline rejection error (replaces alert) */}
                                        <AnimatePresence>
                                            {rejectError && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -4 }}
                                                    className="mt-2 flex items-start space-x-2 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3"
                                                >
                                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-red-300 font-medium">{rejectError}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            onClick={() => { setIsRejecting(false); setReason(''); setRejectError('') }}
                                            className="py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 transition text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            disabled={validating}
                                            className="py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
                                        >
                                            {validating
                                                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Sending...</span></>
                                                : <span>Confirm Rejection</span>
                                            }
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ValidationView
