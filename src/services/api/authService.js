// services/api/authService.js
import apiClient from './axios';
import { saveToken, saveUserData } from '../utils/storage';

const BASE_URL = 'https://moneymitraa.com/';

/**
 * Normalize image URL
 */
const normalizeImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('file://')) return imageUrl; // ← FIX: local file URIs
  return BASE_URL + imageUrl;
};

// ─── Login APIs ───────────────────────────────────────────────────────────────

/**
 * Send OTP for login
 */
export const loginSendOtp = async (mobile) => {
  try {
    const response = await apiClient.post('/login_send_otp', { mobile });

    const isDirect = response.data?.direct_login;
    const token = response.data?.token;
    const user = response.data?.user;

    if (isDirect && token) {
      await saveToken(token);
      if (user) {
        const normalizedUser = {
          ...user,
          profile_image: normalizeImageUrl(user.profile_image),
        };
        await saveUserData(normalizedUser);
        console.log('🔐 Direct Login: User saved without OTP:', normalizedUser.profile_image);
      }
    }

    return {
      success: true,
      direct_login: !!isDirect,
      token,
      user: user ? { ...user, profile_image: normalizeImageUrl(user.profile_image) } : null,
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
 * Verify OTP for login
 */
export const loginVerifyOtp = async (mobile, otp) => {
  try {
    const response = await apiClient.post('/login_verify_otp', { mobile, otp });

    const token = response.data?.token;
    const user = response.data?.user;

    if (token) await saveToken(token);
    if (user) {
      const normalizedUser = {
        ...user,
        profile_image: normalizeImageUrl(user.profile_image),
      };
      await saveUserData(normalizedUser);
      console.log('🔐 Login: User saved with image:', normalizedUser.profile_image);
    }

    return {
      success: true,
      data: response.data,
      message: response.message,
      token,
      user: user ? { ...user, profile_image: normalizeImageUrl(user.profile_image) } : null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// ─── Register APIs ────────────────────────────────────────────────────────────

/**
 * Send OTP for registration
 */
export const registerSendOtp = async (userData) => {
  try {
    const payload = {
      name: userData.name,
      mobile: userData.mobile,
      email: userData.email,
    };

    if (userData.referralCode) {
      payload.referral_code = userData.referralCode;
    }

    const response = await apiClient.post('/register_send_otp', payload);
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
 * Verify OTP for registration
 */
export const registerVerifyOtp = async (mobile, otp) => {
  try {
    const response = await apiClient.post('/register_verify_otp', { mobile, otp });

    const token = response.data?.token;
    const user = response.data?.user;

    if (token) await saveToken(token);
    if (user) {
      const normalizedUser = {
        ...user,
        profile_image: normalizeImageUrl(user.profile_image),
      };
      await saveUserData(normalizedUser);
      console.log('📝 Register: User saved with image:', normalizedUser.profile_image);
    }

    return {
      success: true,
      data: response.data,
      message: response.message,
      token,
      user: user ? { ...user, profile_image: normalizeImageUrl(user.profile_image) } : null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};