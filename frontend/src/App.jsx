import { useState, useEffect } from 'react'
import { Telescope, LayoutDashboard, PlusCircle, LogOut, Radio } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from './api'
import { ToastProvider, useToast } from './components/Toast'
import PlanForm from './components/PlanForm'
import Dashboard from './components/Dashboard'
import ValidationView from './components/ValidationView'
import Login from './components/Login'

function AppShell() {
    const toast = useToast()
    const [user, setUser] = useState(null)
    const [view, setView] = useState('dashboard')
    const [selectedPlanId, setSelectedPlanId] = useState(null)
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(false)

    const fetchPlans = async () => {
        if (!user) return
        setLoading(true)
        try {
            const data = await api.getPlans({ user_id: user.username, role: user.role })
            setPlans(data)
        } catch (err) {
            toast.error('Failed to load plans. Please refresh.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPlans() }, [user])

    const handleLoginSuccess = (userData) => {
        setUser(userData)
        setView('dashboard')
        toast.success(`Welcome back, ${userData.full_name}!`)
    }

    const handleLogout = () => {
        setUser(null)
        setPlans([])
        setView('dashboard')
    }

    const handleCreateSuccess = () => {
        fetchPlans()
        setView('dashboard')
        toast.success('Science plan created and saved as Draft.')
    }

    const handleValidateClick = (id) => {
        setSelectedPlanId(id)
        setView('validate')
    }

    if (!user) {
        return <Login onLoginSuccess={handleLoginSuccess} />
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100" style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(56,189,248,0.06) 0%, transparent 50%)'
        }}>
            {/* Navigation */}
            <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div
                        className="flex items-center space-x-3 cursor-pointer group"
                        onClick={() => setView('dashboard')}
                    >
                        <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl group-hover:bg-indigo-600/30 transition">
                            <Telescope className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tight text-white">FLICKER</span>
                            <div className="text-[9px] text-indigo-400/60 uppercase tracking-[0.2em] font-semibold leading-none">OCS · Gemini Observatory</div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setView('dashboard')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${view === 'dashboard' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>{user.role === 'Science Observer' ? 'Validation Queue' : 'My Plans'}</span>
                            </button>

                            {user.role === 'Astronomer' && (
                                <button
                                    onClick={() => setView('create')}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${view === 'create' ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20'}`}
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>New Plan</span>
                                </button>
                            )}
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <div className="text-right">
                                    <div className="text-sm font-bold text-white leading-tight">{user.full_name}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-indigo-400/80 font-semibold">{user.role}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                title="Sign Out"
                                className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Status bar */}
            <div className="bg-slate-900/40 border-b border-white/5 px-6 py-1.5">
                <div className="max-w-7xl mx-auto flex items-center space-x-2 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    <Radio className="w-3 h-3 text-emerald-500" />
                    <span>System Operational</span>
                    <span className="mx-2 text-slate-700">|</span>
                    <span>Gemini North · Mauna Kea</span>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {view === 'dashboard' && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Dashboard
                                plans={plans}
                                onRefresh={fetchPlans}
                                onValidate={handleValidateClick}
                                loading={loading}
                                userRole={user.role}
                                toast={toast}
                            />
                        </motion.div>
                    )}

                    {view === 'create' && (
                        <motion.div
                            key="create"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.2 }}
                        >
                            <PlanForm
                                astronomerId={user.username}
                                onSuccess={handleCreateSuccess}
                                onCancel={() => setView('dashboard')}
                                toast={toast}
                            />
                        </motion.div>
                    )}

                    {view === 'validate' && (
                        <motion.div
                            key="validate"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ValidationView
                                planId={selectedPlanId}
                                onSuccess={() => { fetchPlans(); setView('dashboard'); }}
                                onCancel={() => setView('dashboard')}
                                toast={toast}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}

function App() {
    return (
        <ToastProvider>
            <AppShell />
        </ToastProvider>
    )
}

export default App
