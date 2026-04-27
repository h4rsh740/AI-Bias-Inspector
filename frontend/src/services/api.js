import axios from 'axios';

// API Base URL - Update this when deploying to cloud
const API_BASE_URL = 'http://localhost:8000';

export const generateData = async () => {
  const response = await axios.post(`${API_BASE_URL}/generate-data`, { n_samples: 500, seed: 42 });
  return response.data;
};

export const profileData = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_BASE_URL}/profile-data`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const trainModel = async (file, useGender) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('use_gender', useGender);

  const response = await axios.post(`${API_BASE_URL}/train-model`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const mitigateBias = async (file, useGender) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('use_gender', useGender);

  const response = await axios.post(`${API_BASE_URL}/mitigate-bias`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const predictLoan = async (applicant) => {
  const response = await axios.post(`${API_BASE_URL}/predict-loan`, applicant);
  return response.data;
};

export const batchPredict = async (file, useGender) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('use_gender', useGender);
  const response = await axios.post(`${API_BASE_URL}/batch-predict`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
