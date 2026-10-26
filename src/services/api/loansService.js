// services/api/loansService.js
import apiClient from './axios';

/**
 * Get loans list
 * @returns {Promise}
 */
export const getLoans = async () => {
    try {
        const response = await apiClient.get('/loans');
        return {
            success: true,
            data: response.data,
            message: response.message,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
        };
    }
};

/**
 * Get loan details by ID
 * @param {number} loanId
 * @returns {Promise}
 */
export const getLoanDetails = async (loanId) => {
    try {
        const response = await apiClient.get(`/loan_details/${loanId}`);
        return {
            success: true,
            data: response.data,
            message: response.message,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
        };
    }
};

/**
 * Apply for a loan
 * @param {Object} payload
 * @param {number} payload.amount
 * @param {number} payload.tenure_days
 * @param {string} payload.purpose
 * @returns {Promise}
 */
export const applyLoan = async (payload) => {
    try {
        const response = await apiClient.post('/loans_apply', payload);
        return {
            success: true,
            data: response.data,
            message: response.message,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            data: null,
        };
    }
};

export const submitLoanRepayment = async (loanId, formData) => {
    try {
        const response = await apiClient.post(
            `/loans/submit-pay/${loanId}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return {
            success: true,
            data: response.data,
            message: response.message,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};

export const calculateLoan = async (payload) => {
    try {
        const response = await apiClient.post('/loans/calculate', payload);
        return {
            success: true,
            data: response.data,
            message: response.message,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};


export const getAdminPaymentDetails = async () => {
    try {
        const response = await apiClient.get('/admin-payment-detail');
        return {
            success: true,
            data: response.data,
            message: response.message,
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};