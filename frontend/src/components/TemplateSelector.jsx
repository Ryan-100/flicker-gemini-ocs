import { motion } from 'framer-motion'
import { PlusCircle, Telescope, Star, Globe, Zap, Wind, X } from 'lucide-react'

// Diagram UC-1 step 3a1: System displays available plan templates from database
// These are the built-in Gemini OCS science plan templates
export const PLAN_TEMPLATES = [
    {
        id: 'deep_galaxy',
        name: 'Deep Galaxy Imaging',
        description: 'Long-exposure imaging of a distant galaxy with standard photometric filters.',
        icon: Globe,
        accent: 'indigo',
        badge: 'Wide Field',
        values: {
            instrument: 'GMOS-N',
            target: {
                name: '',
                ra: '',
                dec: '',
                magnitude: 14.0,
                object_type: 'Galaxy',
            },
            conditions: { seeing: 0.6, cloud_cover: 20, water_vapor: 10 },
            exposure: { exp_time: 600, num_exposures: 10, filters: ['B', 'V', 'R'] },
            data_proc: {
                file_type: 'FITS',
                file_quality: 'Archive-Quality',
                image_proc: { color_mode: 'Color', contrast: 55, brightness: 50, saturation: 60 }
            },
            scheduling: { date_start: '', date_end: '', priority: 2, time_window_notes: 'Prefer dark sky conditions and moon < 30% illuminated.' }
        }
    },
    {
        id: 'stellar_spectroscopy',
        name: 'Stellar Spectroscopy',
        description: 'Low-resolution spectroscopic analysis of a bright star using GNIRS.',
        icon: Star,
        accent: 'amber',
        badge: 'Spectroscopy',
        values: {
            instrument: 'GNIRS',
            target: {
                name: '',
                ra: '',
                dec: '',
                magnitude: 8.0,
                object_type: 'Star',
            },
            conditions: { seeing: 0.5, cloud_cover: 10, water_vapor: 5 },
            exposure: { exp_time: 300, num_exposures: 4, filters: ['J', 'H', 'K'] },
            data_proc: {
                file_type: 'FITS',
                file_quality: 'High',
                image_proc: { color_mode: 'B&W', contrast: 50, brightness: 50, saturation: 50 }
            },
            scheduling: { date_start: '', date_end: '', priority: 1, time_window_notes: '' }
        }
    },
    {
        id: 'nebula_narrowband',
        name: 'Nebula Narrow-Band',
        description: 'Emission nebula imaging using Hα and OIII narrow-band filters.',
        icon: Zap,
        accent: 'emerald',
        badge: 'Narrow-Band',
        values: {
            instrument: 'GMOS-N',
            target: {
                name: '',
                ra: '',
                dec: '',
                magnitude: 12.0,
                object_type: 'Nebula',
            },
            conditions: { seeing: 0.7, cloud_cover: 10, water_vapor: 15 },
            exposure: { exp_time: 900, num_exposures: 6, filters: ['Hα', 'OIII'] },
            data_proc: {
                file_type: 'FITS',
                file_quality: 'Archive-Quality',
                image_proc: { color_mode: 'Color', contrast: 60, brightness: 45, saturation: 70 }
            },
            scheduling: { date_start: '', date_end: '', priority: 3, time_window_notes: 'Best results with seeing < 1.0 arcsec.' }
        }
    },
    {
        id: 'star_cluster',
        name: 'Open Star Cluster',
        description: 'Photometric survey of an open star cluster for HR diagram analysis.',
        icon: Wind,
        accent: 'sky',
        badge: 'Photometry',
        values: {
            instrument: 'GMOS-S',
            target: {
                name: '',
                ra: '',
                dec: '',
                magnitude: 6.0,
                object_type: 'Star Cluster',
            },
            conditions: { seeing: 0.8, cloud_cover: 30, water_vapor: 20 },
            exposure: { exp_time: 120, num_exposures: 15, filters: ['B', 'V', 'I'] },
            data_proc: {
                file_type: 'FITS',
                file_quality: 'High',
                image_proc: { color_mode: 'B&W', contrast: 50, brightness: 50, saturation: 50 }
            },
            scheduling: { date_start: '', date_end: '', priority: 2, time_window_notes: '' }
        }
    },
]

const ACCENT = {
    indigo: 'from-indigo-900/40 to-indigo-800/10 border-indigo-500/30 hover:border-indigo-400/60',
    amber: 'from-amber-900/30 to-amber-800/10 border-amber-500/30 hover:border-amber-400/60',
    emerald: 'from-emerald-900/30 to-emerald-800/10 border-emerald-500/30 hover:border-emerald-400/60',
    sky: 'from-sky-900/30 to-sky-800/10 border-sky-500/30 hover:border-sky-400/60',
}
const ICON_CLR = {
    indigo: 'text-indigo-400 bg-indigo-900/40 border-indigo-500/30',
    amber: 'text-amber-400 bg-amber-900/40 border-amber-500/30',
    emerald: 'text-emerald-400 bg-emerald-900/40 border-emerald-500/30',
    sky: 'text-sky-400 bg-sky-900/40 border-sky-500/30',
}
const BADGE = {
    indigo: 'bg-indigo-900/60 text-indigo-400 border border-indigo-600/40',
    amber: 'bg-amber-900/60 text-amber-400 border border-amber-600/40',
    emerald: 'bg-emerald-900/60 text-emerald-400 border border-emerald-600/40',
    sky: 'bg-sky-900/60 text-sky-400 border border-sky-600/40',
}

// Diagram UC-1 step 3a1-3a2: Display available templates and let Astronomer select
function TemplateSelector({ onSelectTemplate, onBlankPlan, onCancel }) {
    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-white/8 rounded-2xl rounded-b-none p-8">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                            <Telescope className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-white">Create New Science Plan</h2>
                            <p className="text-slate-400 text-sm mt-0.5">Start from scratch or choose a pre-configured template</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur border border-white/8 border-t-0 rounded-2xl rounded-t-none p-10">

                {/* Blank Plan Option */}
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onBlankPlan}
                    className="w-full flex items-center space-x-5 p-6 mb-8 bg-white/3 border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-600/5 rounded-2xl text-left transition group"
                >
                    <div className="p-3 bg-slate-800 border border-white/10 rounded-xl group-hover:border-indigo-500/30 transition">
                        <PlusCircle className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition" />
                    </div>
                    <div>
                        <div className="text-base font-bold text-slate-200 group-hover:text-white transition">Blank Science Plan</div>
                        <p className="text-slate-500 text-sm mt-0.5">Start with an empty form and fill in all fields manually.</p>
                    </div>
                    <div className="ml-auto text-slate-600 group-hover:text-indigo-400 transition text-sm font-semibold">
                        Start blank →
                    </div>
                </motion.button>

                {/* Templates Section */}
                <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">
                        — Or select a template —
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PLAN_TEMPLATES.map((tpl, i) => {
                            const Icon = tpl.icon
                            return (
                                <motion.button
                                    key={tpl.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onSelectTemplate(tpl)}
                                    className={`relative w-full text-left p-6 rounded-2xl bg-gradient-to-br border-2 transition ${ACCENT[tpl.accent]}`}
                                >
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-2.5 rounded-xl border ${ICON_CLR[tpl.accent]}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="font-bold text-white text-sm">{tpl.name}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${BADGE[tpl.accent]}`}>
                                                    {tpl.badge}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-xs leading-relaxed">{tpl.description}</p>
                                        </div>
                                    </div>

                                    {/* Mini preview */}
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Instrument', value: tpl.values.instrument },
                                            { label: 'Filters', value: tpl.values.exposure.filters.join(', ') },
                                            { label: 'Exp. Time', value: `${tpl.values.exposure.exp_time}s × ${tpl.values.exposure.num_exposures}` },
                                        ].map(item => (
                                            <div key={item.label} className="bg-black/20 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">{item.label}</div>
                                                <div className="text-[11px] text-slate-300 font-semibold font-mono mt-0.5 truncate">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TemplateSelector
