import { Alert } from 'react-native';

/**
 * Show error alert
 * @param {string} message - Error message
 * @param {string} title - Alert title
 */
export const showError = (message, title = 'Error') => {
    Alert.alert(title, message, [{ text: 'OK' }]);
};

/**
 * Show success alert
 * @param {string} message - Success message
 * @param {string} title - Alert title
 */
export const showSuccess = (message, title = 'Success') => {
    Alert.alert(title, message, [{ text: 'OK' }]);
};

/**
 * Handle API error
 * @param {Object} error - Error object from API
 * @param {Function} callback - Optional callback
 */
export const handleApiError = (error, callback) => {
    const message = error?.message || 'Something went wrong. Please try again.';

    // Network error
    if (error?.message === 'Network Error') {
        showError('No internet connection. Please check your network and try again.', 'Network Error');
        return;
    }

    // Timeout error
    if (error?.code === 'ECONNABORTED') {
        showError('Request timeout. Please try again.', 'Timeout');
        return;
    }

    // Show error alert
    showError(message);

    // Execute callback if provided
    if (callback && typeof callback === 'function') {
        callback(error);
    }
};

/**
 * Parse validation errors from API response
 * @param {Object} errorData - Error data from API
 * @returns {string}
 */
export const parseValidationErrors = (errorData) => {
    if (errorData?.errors && typeof errorData.errors === 'object') {
        const errors = Object.values(errorData.errors).flat();
        return errors.join('\n');
    }
    return errorData?.message || 'Validation failed';
};