import axios from './axiosInstance';

export async function getCompanyProfile() {
  const { data } = await axios.get('/company');
  return data;
}
