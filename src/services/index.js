// services/index.js
// Auth services
export {
    loginSendOtp,
    loginVerifyOtp,
    registerSendOtp,
    registerVerifyOtp,
    logout,
} from './api/authService';

// Dashboard services
export {
    getDashboardData,
    getUserProfile,
    updateUserProfile,
    uploadProfileImages,
} from './api/dashboardService';

// Loans services
export {
    getLoans,
} from './api/loansService';

// Storage utilities
export {
    saveToken,
    getToken,
    clearToken,
    saveUserData,
    getUserData,
    clearUserData,
    clearAllData,
} from './utils/storage';

export {
    showError,
    showSuccess,
    handleApiError,
    parseValidationErrors,
} from './utils/errorHandler';

export {
    getReferralData,
    getWalletTransactions,
    submitWithdrawal,
} from './api/referralService';

export {
    getLoans,
    getLoanDetails,
    applyLoan,
} from './api/loansService';