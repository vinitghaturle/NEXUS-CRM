import { getAuthToken } from './firebase';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Dispatches an action with payload to the Apps Script Web App backend.
 * Handles token loading and formats responses.
 * @param {string} action - Backend action verb (e.g. "auth.me", "tasks.list")
 * @param {Object} payload - Parameter payload for the action
 * @returns {Promise<T>} The data response payload
 */
export const callApi = async <T = any>(action: string, payload: any = {}): Promise<T> => {
  const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    throw new Error('VITE_APPS_SCRIPT_URL is not configured.');
  }

  // Retrieve current Firebase token
  const token = await getAuthToken();
  if (!token && action !== 'system.setup') {
    throw new Error('User is unauthenticated. No Firebase token found.');
  }

  const requestBody = {
    action: action,
    auth: {
      idToken: token || ''
    },
    payload: payload
  };

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // Bypasses preflight in GAS
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`HTTP network error! Status: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();
  
  if (result.status === 'error') {
    throw new Error(result.error?.message || `API error occurred for action ${action}`);
  }

  return result.data as T;
};
