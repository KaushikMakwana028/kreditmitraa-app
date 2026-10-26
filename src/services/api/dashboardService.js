// services/api/dashboardService.js
import apiClient from './axios';

/**
 * Get dashboard data
 * @returns {Promise}
 */
export const getDashboardData = async () => {
  try {
    const response = await apiClient.get('/dashboard');
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
 * Get user profile
 * @returns {Promise}
 */
export const getUserProfile = async () => {
  try {
    const response = await apiClient.get('/profile');
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

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise}
 */
export const updateUserProfile = async (profileData) => {
  try {
    console.log(profileData, '==============');
    const response = await apiClient.post('/profile_update', profileData);
    console.log(response, '==============');
    
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

/**
 * Upload profile images (multipart/form-data)
 * @param {FormData} formData - Form data with images
 * @returns {Promise}
 */
export const uploadProfileImages = async (formData) => {
  try {
    const response = await apiClient.post('/profile_update', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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