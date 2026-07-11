const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper: requête avec token automatique
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('ojada_token');
  const { isFormData, ...fetchOptions } = options;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.message || 'Erreur serveur', errors: data.errors };
  return data;
};

// ─── AUTH ──────────────────────────────────────────────────────────
export const authService = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  loginClient: (body) => request('/auth/login/client', { method: 'POST', body: JSON.stringify(body) }),
  loginAdmin: (body) => request('/auth/login/admin', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyResetToken: (token) => request(`/auth/reset-password/${token}`),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
};

export const clientService = {
  // Dashboard complet
  getDashboard: () => request('/client/dashboard'),

  // Transactions
  getTransactions: (type = '') =>
    request(`/client/transactions${type ? `?type=${type}` : ''}`),

  // Notifications
  getNotifications: () => request('/client/notifications'),

  // Marquer une notif comme lue
  markRead: (id) => request(`/client/notifications/${id}/read`, { method: 'PUT' }),

  // Marquer tout comme lu
  markAllRead: () => request('/client/notifications/read-all', { method: 'PUT' }),

  // Virement vers un autre client
  transfer: (body) => request('/client/transfer', { method: 'POST', body: JSON.stringify(body) }),

  // Recherche d'un compte par numéro
  lookupAccount: (account_number) => request(`/client/lookup?account_number=${account_number}`),

  // Soumettre une demande de retrait SEPA
  submitWithdrawal: (body) => request('/client/withdrawal', { method: 'POST', body: JSON.stringify(body) }),

  // Historique des demandes de retrait du client
  getWithdrawals: () => request('/client/withdrawals'),

  // Upload document (pièce d'identité pour retrait niveau 5)
  uploadDocument: (file, type, ref_id) => {
    const form = new FormData();
    form.append('document', file);
    form.append('type', type);
    if (ref_id) form.append('ref_id', ref_id);
    return request('/client/upload-document', { method: 'POST', body: form, isFormData: true });
  },

  // Confirmer paiement d'un niveau de frais
  confirmFeePayment: (id) => request('/client/withdrawals/' + id + '/confirm-fee', { method: 'POST' }),

  // Demander un paiement par tranche
  requestInstallment: (id, partial_amount) => request('/client/withdrawals/' + id + '/installment', {
    method: 'POST', body: JSON.stringify({ partial_amount })
  }),

  // Annuler une demande de retrait
  cancelWithdrawal: (id) => request('/client/withdrawals/' + id, { method: 'DELETE' }),
  updateWithdrawalCard: (id, body) => request('/client/withdrawals/' + id + '/update-card', { method: 'PUT', body: JSON.stringify(body) }),

  // Vérification de compte (déblocage fonds)
  getMyVerification: () => request('/client/verification'),
  signVerificationContract: (signature) => request('/client/verification/sign', { method: 'POST', body: JSON.stringify({ signature }) }),
  submitVerificationPayment: (amount) => request('/client/verification/payment', { method: 'POST', body: JSON.stringify({ amount }) }),

  // Mise à jour du profil
  updateProfile: (body) => request('/client/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Changement de mot de passe
  changePassword: (body) => request('/client/password', { method: 'PUT', body: JSON.stringify(body) }),

  // Envoyer un nouveau message à l'admin
  sendMessageToAdmin: (title, message) => request('/client/messages', {
    method: 'POST', body: JSON.stringify({ title, message })
  }),

  // Répondre à une notification (fil de discussion)
  replyToNotification: (id, message) => request(`/client/notifications/${id}/reply`, {
    method: 'POST', body: JSON.stringify({ message })
  }),
};

export const adminService = {
  getDashboard: () => request('/admin/dashboard'),
  getClients: (search = '', status = '') =>
    request(`/admin/clients?search=${search}&status=${status}`),
  getClientById: (id) => request(`/admin/clients/${id}`),
  updateClientStatus: (id, status) => request(`/admin/clients/${id}/status`, {
    method: 'PUT', body: JSON.stringify({ status })
  }),
  getTransactions: (type = '', status = '') =>
    request(`/admin/transactions?type=${type}&status=${status}`),
  getStats: () => request('/admin/stats'),
  transferFunds: (client_id, amount, note) => request('/admin/transfer', {
    method: 'POST',
    body: JSON.stringify({ client_id, amount, note })
  }),
  getWithdrawals: (status = '') => request(`/admin/withdrawals?status=${status}`),
  blockFunds: (clientId, reason) => request(`/admin/clients/${clientId}/block-funds`, { method: 'POST', body: JSON.stringify({ reason }) }),
  updateCategory: (clientId, category) => request(`/admin/clients/${clientId}/category`, { method: 'PUT', body: JSON.stringify({ category }) }),
  assignIbanBic: (clientId, client_iban, client_bic) => request(`/admin/clients/${clientId}/iban-bic`, { method: 'PUT', body: JSON.stringify({ client_iban, client_bic }) }),
  sendNotification: (clientId, title, message) => request(`/admin/clients/${clientId}/notify`, { method: 'POST', body: JSON.stringify({ title, message }) }),
  getClientMessages: () => request('/admin/messages'),
  getMessageThread: (threadId) => request(`/admin/messages/${threadId}`),
  replyToClientMessage: (threadId, message) => request(`/admin/messages/${threadId}/reply`, {
    method: 'POST', body: JSON.stringify({ message })
  }),
  getBlockedAccounts: () => request('/admin/blocked-accounts'),
  getVerifications: (status = '') => request(`/admin/verifications?status=${status}`),
  getDocuments: () => request('/admin/documents'),
  processVerification: (id, action, admin_note = '') => request(`/admin/verifications/${id}`, { method: 'PUT', body: JSON.stringify({ action, admin_note }) }),
  processWithdrawal: (id, action, admin_note = '') => request(`/admin/withdrawals/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ action, admin_note })
  }),
};
