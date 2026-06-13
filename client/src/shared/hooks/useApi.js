import { useCallback } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";

export function useApi(apiBaseUrl) {
  const getAuthHeaders = useCallback(() => {
    const token = window.localStorage.getItem("certificate-studio-session");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const get = useCallback(async (path, config = {}) => {
    const url = buildApiUrl(apiBaseUrl, path);
    const headers = { ...getAuthHeaders(), ...config.headers };
    const response = await axios.get(url, { ...config, headers });
    return response.data;
  }, [apiBaseUrl, getAuthHeaders]);

  const post = useCallback(async (path, data, config = {}) => {
    const url = buildApiUrl(apiBaseUrl, path);
    const headers = { ...getAuthHeaders(), ...config.headers };
    const response = await axios.post(url, data, { ...config, headers });
    return response.data;
  }, [apiBaseUrl, getAuthHeaders]);

  const del = useCallback(async (path, config = {}) => {
    const url = buildApiUrl(apiBaseUrl, path);
    const headers = { ...getAuthHeaders(), ...config.headers };
    const response = await axios.delete(url, { ...config, headers });
    return response.data;
  }, [apiBaseUrl, getAuthHeaders]);

  const uploadAttachment = useCallback(async (file, purpose = "certificate") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);
    
    return post("api/attachments/sign-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }, [post]);

  const cleanupAttachments = useCallback(async (attachments = []) => {
    if (!attachments.length) return;
    return post("api/attachments/cleanup", { attachments });
  }, [post]);

  return { get, post, del, uploadAttachment, cleanupAttachments };
}
