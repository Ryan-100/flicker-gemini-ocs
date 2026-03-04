import { useState, useMemo } from 'react'
import { api } from '../api'
import {
    Save, X, Target as TargetIcon, Settings, Wind, Camera, Box,
    PlusCircle, FlaskConical, AlertTriangle, CheckCircle2, Info,
    Calendar, ChevronRight, ChevronLeft, ClipboardList, BookOpen, MessageSquare
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Coordinate validators (Diagram UC-1 step 6) ─── */
const RA_RE  = /^\d{2}:\d{2}:\d{2}(\.\d)?$/
const DEC_RE = /^[+-]?\d{2}:\d{2}:\d{2}(\.\d)?$/

function validateRA(v)  { return v && !RA_RE.test(v.trim())  ? 'Format must be HH:MM:SS.S (e.g. 05:34:32.0)' : '' }
function validateDEC(v) { return v && !DEC_RE.test(v.trim()) ? 'Format must be ±DD:MM:SS.S (e.g. +22:00:52.0)' : '' }

/* ─── Sub-components ─── */
function SectionTitle({ icon: Icon, title, step }) {
    return (
        <div className="flex items-center space-x-3 mb-6">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-xs font-black text-indigo-400 shrink-0">{step}</div>
            <Icon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{title}</h3>
        </div>
    )
}

function Field({ label, hint, error, children }) {
    return (
        <div>
            <div className="flex justify-between items-baseline mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
                {hint && <span className="text-xs text-slate-600 font-mono">{hint}</span>}
            </div>
            {children}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-1.5 text-xs text-red-400 flex items-center space-x-1"
                    >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{error}</span>
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}

const INPUT = "w-full bg-slate-800/60 border border-white/8 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition text-sm"
const INPUT_ERR = "w-full bg-red-900/20 border border-red-500/40 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition text-sm"
const SELECT = "w-full bg-slate-800/60 border border-white/8 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition text-sm appearance-none cursor-pointer"

const INSTRUMENTS = ['GMOS-N', 'GMOS-S', 'NIRI', 'GNIRS', 'NIFS', 'FLAMINGOS-2', 'NICI']
const OBJECT_TYPES = ['Star', 'Galaxy', 'Nebula', 'Star Cluster', 'Quasar', 'Supernova Remnant', 'Other']
const FILTERS = ['B', 'V', 'R', 'I', 'J', 'H', 'K', 'Hα', 'OIII', 'SII']

/* ─── Cancel Confirm Dialog ─── */
function CancelConfirmDialog({ onConfirm, onCancel }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 16 }}
                className="bg-slate-900 border border-white/10 rounded-2xl p-7 w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Discard Changes?</h3>
                    <p className="text-slate-400 text-sm mt-2">Your unsaved science plan will be lost. This cannot be undone.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onCancel}  className="flex-1 py-3 rounded-xl font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition text-sm">Keep Editing</button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white transition text-sm">Discard</button>
                </div>
            </motion.div>
        </motion.div>
    )
}

/* ─── Plan Review Summary (Diagram UC-1 steps 17-18: Astronomer reviews + comprehensive validation) ─── */
function PlanReviewSummary({ form, totalMin, isLongObs }) {
    const ReviewRow = ({ label, value, warn }) => (
        <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
            <span className="text-slate-500 text-xs">{label}</span>
            <span className={`text-xs font-semibold font-mono ${warn ? 'text-amber-400' : 'text-slate-200'}`}>{value}</span>
        </div>
    )
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-950/50 border border-indigo-500/30 rounded-2xl p-6 mt-6"
        >
            <div className="flex items-center space-x-2 mb-4">
                <ClipboardList className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Plan Review Summary</h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">Review the complete science plan before saving. All required fields have been validated.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-indigo-400/70 font-bold mb-2">Target</p>
                    <ReviewRow label="Object" value={form.target.name || '—'} />
                    <ReviewRow label="Type" value={form.target.object_type} />
                    <ReviewRow label="RA" value={form.target.ra || '—'} />
                    <ReviewRow label="Dec" value={form.target.dec || '—'} />
                    <ReviewRow label="Magnitude" value={form.target.magnitude} />
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-indigo-400/70 font-bold mb-2">Instrument & Conditions</p>
                    <ReviewRow label="Instrument" value={form.instrument} />
                    <ReviewRow label="Seeing" value={`${form.conditions.seeing} arcsec`} />
                    <ReviewRow label="Cloud Cover" value={`${form.conditions.cloud_cover}%`} />
                    <ReviewRow label="Water Vapor" value={`${form.conditions.water_vapor}%`} />
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-indigo-400/70 font-bold mb-2">Exposure</p>
                    <ReviewRow label="Exp. Time" value={`${form.exposure.exp_time}s`} />
                    <ReviewRow label="Num Exposures" value={form.exposure.num_exposures} />
                    <ReviewRow label="Total Duration" value={`${totalMin} min`} warn={isLongObs} />
                    <ReviewRow label="Filters" value={form.exposure.filters.join(', ') || '—'} />
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-indigo-400/70 font-bold mb-2">Data Specifications</p>
                    <ReviewRow label="File Type" value={form.data_proc.file_type} />
                    <ReviewRow label="Quality" value={form.data_proc.file_quality} />
                    <ReviewRow label="Color Mode" value={form.data_proc.image_proc.color_mode} />
                    {form.scheduling?.date_start && (
                        <ReviewRow label="Obs. Window" value={`${form.scheduling.date_start} → ${form.scheduling.date_end || 'open'}`} />
                    )}
                </div>
            </div>
            {isLongObs && (
                <div className="mt-4 flex items-center space-x-2 bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">Long observation warning: total duration exceeds 60 minutes. Scheduling constraints may apply.</p>
                </div>
            )}
        </motion.div>
    )
}

/* ─── Main Component ─── */
// Diagram UC-1 step 3a4: initialValues pre-filled from template when creating from template
// Diagram UC-3 15b: revisePlanId is set when astronomer responds to clarification
function PlanForm({ astronomerId, onSuccess, onCancel, toast, initialValues = null, revisePlanId = null }) {
    const DEFAULT_FORM = {
        astronomer_id: astronomerId || '',
        target: { name: '', ra: '', dec: '', magnitude: 5.0, object_type: 'Galaxy' },
        instrument: 'GMOS-N',
        conditions: { seeing: 0.6, cloud_cover: 20, water_vapor: 10 },
        exposure: { exp_time: 300, num_exposures: 5, filters: ['V'] },
        data_proc: {
            file_type: 'FITS',
            file_quality: 'High',
            image_proc: { color_mode: 'B&W', contrast: 50, brightness: 50, saturation: 50 }
        },
        scheduling: { date_start: '', date_end: '', priority: 1, time_window_notes: '' }
    }

    // Diagram UC-1 step 3a3: merge template values over defaults, preserving astronomer_id
    const buildInitialForm = () => {
        if (!initialValues) return DEFAULT_FORM
        return {
            ...DEFAULT_FORM,
            ...initialValues,
            astronomer_id: astronomerId || '',
            // Always start with empty target so astronomer fills in step 5
            target: { ...DEFAULT_FORM.target, ...(initialValues.target || {}) },
            conditions: { ...DEFAULT_FORM.conditions, ...(initialValues.conditions || {}) },
            exposure: { ...DEFAULT_FORM.exposure, ...(initialValues.exposure || {}) },
            data_proc: {
                ...DEFAULT_FORM.data_proc,
                ...(initialValues.data_proc || {}),
                image_proc: { ...DEFAULT_FORM.data_proc.image_proc, ...(initialValues.data_proc?.image_proc || {}) }
            },
            scheduling: { ...DEFAULT_FORM.scheduling, ...(initialValues.scheduling || {}) },
        }
    }

    const [form, setForm] = useState(buildInitialForm)

    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    // Diagram UC-1 steps 17-18: show review summary before saving
    const [showReview, setShowReview] = useState(false)

    /* ─── Derived values ─── */
    const totalSec = form.exposure.exp_time * form.exposure.num_exposures
    const totalMin = (totalSec / 60).toFixed(1)
    const isLongObs = totalSec > 3600  // Diagram UC-1 step 12a: exceeds recommended limits

    const isDirty = useMemo(() => form.target.name !== '' || form.target.ra !== '' || form.target.dec !== '', [form])

    /* ─── Handlers ─── */
    const setTarget = (patch) => setForm(f => ({ ...f, target: { ...f.target, ...patch } }))
    const setCond   = (patch) => setForm(f => ({ ...f, conditions: { ...f.conditions, ...patch } }))
    const setExp    = (patch) => setForm(f => ({ ...f, exposure: { ...f.exposure, ...patch } }))
    const setData   = (patch) => setForm(f => ({ ...f, data_proc: { ...f.data_proc, ...patch } }))
    const setImg    = (patch) => setForm(f => ({ ...f, data_proc: { ...f.data_proc, image_proc: { ...f.data_proc.image_proc, ...patch } } }))
    const setSched  = (patch) => setForm(f => ({ ...f, scheduling: { ...f.scheduling, ...patch } }))

    const toggleFilter = (f) => {
        const cur = form.exposure.filters
        setExp({ filters: cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f] })
    }

    const validateField = (field, value) => {
        let err = ''
        if (field === 'ra')  err = validateRA(value)
        if (field === 'dec') err = validateDEC(value)
        setErrors(prev => ({ ...prev, [field]: err }))
    }

    // Diagram UC-1 step 17: Astronomer reviews complete plan summary
    const handleReviewPlan = (e) => {
        e.preventDefault()
        const raErr  = validateRA(form.target.ra)
        const decErr = validateDEC(form.target.dec)
        if (raErr || decErr) {
            setErrors(prev => ({ ...prev, ra: raErr, dec: decErr }))
            toast.error('Please fix coordinate format errors before reviewing.')
            return
        }
        if (form.exposure.filters.length === 0) {
            toast.error('Please select at least one filter.')
            return
        }
        setShowReview(true)
    }

    // Diagram UC-1 steps 19-21 / UC-3 15b: save as Draft (new) OR save as Revised (existing)
    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload = {
                ...form,
                astronomer_id: astronomerId,
                // Only include scheduling if dates/notes are provided (it's optional)
                scheduling: (form.scheduling.date_start || form.scheduling.date_end || form.scheduling.time_window_notes)
                    ? form.scheduling
                    : null
            }
            if (revisePlanId) {
                // Diagram UC-3 15b: revise existing plan in response to clarification
                await api.revisePlan(revisePlanId, payload)
                toast.success('Plan revised and saved. You can now re-submit for validation.')
            } else {
                await api.createPlan(payload)
            }
            onSuccess()
        } catch (err) {
            const detail = err.response?.data?.detail
            const msg = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(' | ')
                    : err.response?.data?.message || err.response?.data?.error
                        || (revisePlanId ? 'Failed to revise plan.' : 'Failed to create plan.') + ' Check all fields and try again.'
            toast.error(msg)
            setShowReview(false)
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        if (isDirty) { setShowCancelConfirm(true) } else { onCancel() }
    }

    return (
        <>
            <AnimatePresence>
                {showCancelConfirm && (
                    <CancelConfirmDialog
                        onConfirm={onCancel}
                        onCancel={() => setShowCancelConfirm(false)}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-white/8 rounded-2xl rounded-b-none p-8">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                            <PlusCircle className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-white">Create New Science Plan</h2>
                            <p className="text-slate-400 text-sm mt-0.5">Define parameters for your Gemini OCS observation</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleReviewPlan} className="bg-slate-900/60 backdrop-blur border border-white/8 border-t-0 rounded-2xl rounded-t-none p-10 space-y-10">

                    {/* Revision mode banner — shown when astronomer responds to clarification (UC-3 15b) */}
                {revisePlanId && (
                    <div className="flex items-start space-x-3 mb-8 bg-violet-950/60 border border-violet-500/30 rounded-2xl px-5 py-4">
                        <MessageSquare className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-violet-300">Responding to Clarification Request</p>
                            <p className="text-xs text-slate-400 mt-0.5">Update any fields the Science Observer questioned. Saving will change the plan status to <span className="text-amber-300 font-semibold">Revised</span> — then re-submit for validation.</p>
                        </div>
                    </div>
                )}

                {/* Template banner: shown when form was pre-filled from a template (UC-1 step 3a3-3a4) */}
                {!revisePlanId && initialValues && (
                    <div className="flex items-center space-x-3 mb-8 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl px-5 py-4">
                        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-indigo-300">Template Applied</p>
                            <p className="text-xs text-slate-400 mt-0.5">Form has been pre-filled with template values. Review and update all fields — target coordinates are required.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-xs text-indigo-400/60 hover:text-indigo-300 transition font-semibold underline underline-offset-2 shrink-0"
                        >
                            Change template
                        </button>
                    </div>
                )}

                {/* ── Step 1: Target Information ── */}
                    <section>
                        <SectionTitle icon={TargetIcon} title="Target Information" step="1" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Object Name" error="">
                                <input
                                    type="text" required
                                    className={INPUT}
                                    placeholder="e.g. Messier 31"
                                    value={form.target.name}
                                    onChange={e => setTarget({ name: e.target.value })}
                                />
                            </Field>
                            <Field label="Object Type" error="">
                                <select
                                    className={SELECT}
                                    value={form.target.object_type}
                                    onChange={e => setTarget({ object_type: e.target.value })}
                                >
                                    {OBJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </Field>

                            {/* Diagram UC-1 step 6: System validates coordinate format */}
                            <Field label="Right Ascension" hint="HH:MM:SS.S" error={errors.ra}>
                                <input
                                    type="text" required
                                    className={errors.ra ? INPUT_ERR : INPUT}
                                    placeholder="05:34:32.0"
                                    value={form.target.ra}
                                    onChange={e => { setTarget({ ra: e.target.value }); validateField('ra', e.target.value) }}
                                    onBlur={e => validateField('ra', e.target.value)}
                                />
                            </Field>
                            <Field label="Declination" hint="±DD:MM:SS.S" error={errors.dec}>
                                <input
                                    type="text" required
                                    className={errors.dec ? INPUT_ERR : INPUT}
                                    placeholder="+22:00:52.0"
                                    value={form.target.dec}
                                    onChange={e => { setTarget({ dec: e.target.value }); validateField('dec', e.target.value) }}
                                    onBlur={e => validateField('dec', e.target.value)}
                                />
                            </Field>

                            <Field label="Magnitude" error="">
                                <input
                                    type="number" step="0.1"
                                    className={INPUT}
                                    value={form.target.magnitude}
                                    onChange={e => setTarget({ magnitude: parseFloat(e.target.value) })}
                                />
                            </Field>
                        </div>
                    </section>

                    <hr className="border-white/5" />

                    {/* ── Step 2: Instrument Selection (Diagram UC-1 steps 7-8) ── */}
                    <section>
                        <SectionTitle icon={FlaskConical} title="Instrument Selection" step="2" />
                        {/* Diagram UC-1 step 8: System validates compatibility */}
                        <div className="mb-3 flex items-start space-x-2 text-xs text-slate-500">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>All listed instruments are confirmed available. The system validates compatibility with your target and conditions.</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {INSTRUMENTS.map(inst => (
                                <button
                                    key={inst} type="button"
                                    onClick={() => setForm(f => ({ ...f, instrument: inst }))}
                                    className={`py-3 px-4 rounded-xl font-bold text-sm border transition ${form.instrument === inst
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/30'
                                        : 'bg-slate-800/40 text-slate-400 border-white/5 hover:border-indigo-500/30 hover:text-slate-200'
                                    }`}
                                >
                                    {inst}
                                </button>
                            ))}
                        </div>
                    </section>

                    <hr className="border-white/5" />

                    {/* ── Step 3: Observing Conditions (Diagram UC-1 steps 9-10, NO Sky Condition) ── */}
                    <section>
                        <SectionTitle icon={Wind} title="Observing Conditions" step="3" />
                        {/* Diagram UC-1 step 10: System validates conditions against instrument limits */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Field label="Seeing (arcsec)" hint="0.3 – 3.0" error="">
                                <input type="number" step="0.1" min="0.3" max="3.0" className={INPUT}
                                    value={form.conditions.seeing}
                                    onChange={e => setCond({ seeing: parseFloat(e.target.value) })} />
                                {(form.conditions.seeing < 0.3 || form.conditions.seeing > 3.0) && (
                                    <p className="mt-1 text-xs text-red-400 flex items-center space-x-1">
                                        <AlertTriangle className="w-3 h-3" /><span>Must be between 0.3 and 3.0 arcsec (instrument limit).</span>
                                    </p>
                                )}
                            </Field>
                            <Field label="Cloud Cover (%)" hint="0 – 100" error="">
                                <input type="number" min="0" max="100" className={INPUT}
                                    value={form.conditions.cloud_cover}
                                    onChange={e => setCond({ cloud_cover: parseInt(e.target.value) })} />
                            </Field>
                            <Field label="Water Vapor (%)" hint="0 – 100" error="">
                                <input type="number" min="0" max="100" className={INPUT}
                                    value={form.conditions.water_vapor}
                                    onChange={e => setCond({ water_vapor: parseInt(e.target.value) })} />
                            </Field>
                        </div>
                        <div className="mt-2 flex items-start space-x-2 text-xs text-slate-600">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>No sky condition required (per Gemini OCS professor specification).</span>
                        </div>
                    </section>

                    <hr className="border-white/5" />

                    {/* ── Step 4: Exposure Settings (Diagram UC-1 steps 11-12) ── */}
                    <section>
                        <SectionTitle icon={Settings} title="Exposure Settings" step="4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <Field label="Exposure Time (s)" error="">
                                <input type="number" min="1" className={INPUT}
                                    value={form.exposure.exp_time}
                                    onChange={e => setExp({ exp_time: parseInt(e.target.value) })} />
                            </Field>
                            <Field label="Number of Exposures" error="">
                                <input type="number" min="1" className={INPUT}
                                    value={form.exposure.num_exposures}
                                    onChange={e => setExp({ num_exposures: parseInt(e.target.value) })} />
                            </Field>
                        </div>

                        {/* Diagram UC-1 step 12: System calculates estimated observation duration */}
                        <div className={`flex items-center space-x-3 p-4 rounded-xl border ${isLongObs ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-800/40 border-white/5'}`}>
                            {isLongObs
                                ? <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                                : <CheckCircle2  className="w-5 h-5 text-emerald-400 shrink-0" />
                            }
                            <div>
                                <div className={`text-sm font-bold ${isLongObs ? 'text-amber-300' : 'text-slate-200'}`}>
                                    Total Observation Time: {totalMin} min ({totalSec.toLocaleString()} s)
                                </div>
                                {/* Diagram UC-1 step 12a: warning for long observation */}
                                {isLongObs && (
                                    <div className="text-xs text-amber-400/80 mt-0.5">
                                        ⚠ Long observation exceeds 60 min. Ensure telescope scheduling constraints allow this.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Filter selection */}
                        <div className="mt-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filters</label>
                            <div className="flex flex-wrap gap-2">
                                {FILTERS.map(f => (
                                    <button
                                        key={f} type="button"
                                        onClick={() => toggleFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${form.exposure.filters.includes(f)
                                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                                            : 'bg-slate-800/40 text-slate-500 border-white/5 hover:text-slate-300'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            {form.exposure.filters.length === 0 && (
                                <p className="text-xs text-amber-400 mt-2 flex items-center space-x-1">
                                    <AlertTriangle className="w-3 h-3" /><span>Select at least one filter.</span>
                                </p>
                            )}
                        </div>
                    </section>

                    <hr className="border-white/5" />

                    {/* ── Step 5: Data Processing (Diagram UC-1 steps 13-14) ── */}
                    <section>
                        <SectionTitle icon={Camera} title="Data Specifications (Gemini Standard)" step="5" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <Field label="File Type" error="">
                                    <select className={SELECT}
                                        value={form.data_proc.file_type}
                                        onChange={e => setData({ file_type: e.target.value })}>
                                        <option>FITS</option>
                                        <option>TIFF</option>
                                        <option>JPEG</option>
                                    </select>
                                </Field>
                                <Field label="File Quality" error="">
                                    <select className={SELECT}
                                        value={form.data_proc.file_quality}
                                        onChange={e => setData({ file_quality: e.target.value })}>
                                        <option>Standard</option>
                                        <option>High</option>
                                        <option>Archive-Quality</option>
                                    </select>
                                </Field>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Color Mode</label>
                                    <div className="flex space-x-3">
                                        {['B&W', 'Color'].map(mode => (
                                            <button
                                                key={mode} type="button"
                                                onClick={() => setImg({ color_mode: mode })}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition border ${form.data_proc.image_proc.color_mode === mode
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/30 shadow-lg'
                                                    : 'bg-slate-800/40 text-slate-400 border-white/5 hover:text-slate-200'
                                                }`}
                                            >{mode}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/40 border border-white/5 p-6 rounded-2xl space-y-5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Image Processing Parameters</label>
                                {['contrast', 'brightness', 'saturation'].map(param => (
                                    <div key={param}>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-slate-400 capitalize">{param}</span>
                                            <span className="text-indigo-400">{form.data_proc.image_proc[param]}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100"
                                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer"
                                            value={form.data_proc.image_proc[param]}
                                            onChange={e => setImg({ [param]: parseInt(e.target.value) })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex items-start space-x-2 text-xs text-slate-500">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Data specifications are validated against Gemini OCS standards. FITS format is recommended for archive-quality scientific data.</span>
                        </div>
                    </section>

                    <hr className="border-white/5" />

                    {/* ── Step 6: Scheduling Constraints (Diagram UC-1 steps 15-16, OPTIONAL) ── */}
                    <section>
                        <SectionTitle icon={Calendar} title="Scheduling Constraints (Optional)" step="6" />
                        <p className="text-xs text-slate-500 mb-6 -mt-2">Specify preferred observation date range and priority. Leave blank if no scheduling constraints are required.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Earliest Observation Date" error="">
                                <input
                                    type="date"
                                    className={INPUT}
                                    value={form.scheduling.date_start}
                                    onChange={e => setSched({ date_start: e.target.value })}
                                />
                            </Field>
                            <Field label="Latest Observation Date" error="">
                                <input
                                    type="date"
                                    className={INPUT}
                                    value={form.scheduling.date_end}
                                    min={form.scheduling.date_start || undefined}
                                    onChange={e => setSched({ date_end: e.target.value })}
                                />
                            </Field>
                            {/* Diagram UC-1 step 16: System validates constraints against telescope scheduling rules */}
                            {form.scheduling.date_start && form.scheduling.date_end && form.scheduling.date_end < form.scheduling.date_start && (
                                <div className="md:col-span-2 flex items-center space-x-2 text-xs text-red-400 bg-red-900/10 border border-red-500/30 rounded-xl px-4 py-3">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>End date must be on or after start date.</span>
                                </div>
                            )}
                            <Field label="Priority" error="">
                                <select className={SELECT}
                                    value={form.scheduling.priority}
                                    onChange={e => setSched({ priority: parseInt(e.target.value) })}>
                                    <option value={1}>1 — High Priority</option>
                                    <option value={2}>2 — Medium Priority</option>
                                    <option value={3}>3 — Low Priority</option>
                                </select>
                            </Field>
                            <Field label="Time Window Notes" error="">
                                <input
                                    type="text"
                                    className={INPUT}
                                    placeholder="e.g. Must observe before 03:00 UTC"
                                    value={form.scheduling.time_window_notes}
                                    onChange={e => setSched({ time_window_notes: e.target.value })}
                                />
                            </Field>
                        </div>
                    </section>

                    {/* ── Diagram UC-1 steps 17-18: Review complete plan summary + comprehensive validation ── */}
                    {showReview && (
                        <PlanReviewSummary form={form} totalMin={totalMin} isLongObs={isLongObs} />
                    )}

                    {/* ── Footer ── */}
                    <footer className="flex justify-end pt-6 border-t border-white/5 space-x-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-8 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/10 transition text-sm"
                        >
                            Cancel
                        </button>

                        {!showReview ? (
                            // Diagram UC-1 step 17: "Review Complete Plan Summary" button
                            <button
                                type="submit"
                                disabled={form.exposure.filters.length === 0}
                                className="flex items-center space-x-2 px-10 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white shadow-xl transition disabled:opacity-40 text-sm border border-white/10"
                            >
                                <ClipboardList className="w-4 h-4" />
                                <span>Review Plan</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            // Diagram UC-1 step 19: Astronomer saves plan as draft
                            <button
                                type="button"
                                disabled={loading || form.exposure.filters.length === 0}
                                onClick={handleSubmit}
                                className="flex items-center space-x-2 px-10 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/30 transition disabled:opacity-40 text-sm"
                            >
                                {loading
                                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Saving...</span></>
                                    : <><Save className="w-4 h-4" /><span>Save as Draft</span></>
                                }
                            </button>
                        )}
                    </footer>
                </form>
            </div>
        </>
    )
}

export default PlanForm
