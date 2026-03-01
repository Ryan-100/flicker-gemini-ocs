import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Normalize filters to plain strings when reading plans back (defensive)
const fromFilterObjects = (filters) => (filters || []).map(f => typeof f === 'object' ? f.name : f)

const normalizePlan = (plan) => ({
    ...plan,
    instrument: plan.instrument || null,
    exposure: { ...plan.exposure, filters: fromFilterObjects(plan.exposure?.filters) }
})

export const api = {
    login: (username, password) => axios.post(`${API_BASE}/login`, { username, password }).then(r => r.data),
    getPlans: (params) => axios.get(`${API_BASE}/plans`, { params }).then(r => r.data.map(normalizePlan)),
    getPlan: (id) => axios.get(`${API_BASE}/plans/${id}`).then(r => normalizePlan(r.data)),
    createPlan: (data) => axios.post(`${API_BASE}/plans`, data).then(r => r.data),
    submitPlan: (id, notes) => axios.post(`${API_BASE}/plans/${id}/submit`, { notes }).then(r => r.data),
    validatePlan: (id, approve, category, reason) =>
        axios.post(`${API_BASE}/plans/${id}/validate`, { approve, category, reason }).then(r => r.data),
};

