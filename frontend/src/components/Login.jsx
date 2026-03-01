import { useState } from 'react'
import { Telescope, Lock, User, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../api'

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await api.login(username, password)
            onLoginSuccess(user)
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
            {/* Background blur effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full z-10"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-4">
                        <Telescope className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">FLICKER</h1>
                    <p className="text-slate-400 mt-2 font-medium">Gemini Observatory Control System</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition font-medium"
                                    required
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-white font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 group"
                        >
                            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-sm font-medium">Use dummy credentials for demo:</p>
                        <div className="flex justify-center space-x-4 mt-3">
                            <span className="text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg text-xs font-bold border border-blue-400/20 cursor-pointer hover:bg-blue-400/20 transition" onClick={() => { setUsername('astronomer'); setPassword('password') }}>astronomer</span>
                            <span className="text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-400/20 cursor-pointer hover:bg-indigo-400/20 transition" onClick={() => { setUsername('observer'); setPassword('password') }}>observer</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default Login
