// services/api/referralService.js
import apiClient from './axios';

/**
 * Get referral data
 * @returns {Promise}
 */
export const getReferralData = async () => {
    try {
        const response = await apiClient.get('/referrals');
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
 * Get wallet transactions
 * @returns {Promise}
 */
export const getWalletTransactions = async () => {
    try {
        const response = await apiClient.get('/wallet_transaction');
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
 * Submit withdrawal request
 * @param {number} amount - Withdrawal amount
 * @returns {Promise}
 */
export const submitWithdrawal = async (amount) => {
    try {
        const response = await apiClient.post('/wallet_transaction', { amount });
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