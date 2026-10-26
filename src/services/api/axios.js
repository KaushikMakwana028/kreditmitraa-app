import axios from 'axios';
import { getToken, clearToken } from '../utils/storage';

const BASE_URL = 'https://moneymitraa.com/api';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log('🔐 Token added to request');
            } else {
                console.log('⚠️ No token available for request');
            }
        } catch (error) {
            console.error('❌ Error in request interceptor:', error);
        }

        if (__DEV__) {
            console.log('📤 API Request:', {
                method: config.method?.toUpperCase(),
                url: config.url,
                data: config.data,
                hasToken: !!config.headers.Authorization,
            });
        }

        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log('📥 API Response:', {
                url: response.config.url,
                status: response.status,
                data: response.data,
            });
        }

        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        if (__DEV__) {
            console.error('❌ API Error:', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.message,
                data: error.response?.data,
            });
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            console.log('🔄 Token expired, clearing storage...');
            await clearToken();
        }

        return Promise.reject({
            message: error.response?.data?.message || error.message || 'Something went wrong',
            status: error.response?.status,
            data: error.response?.data,
        });
    }
);

export default apiClient;
export { BASE_URL };