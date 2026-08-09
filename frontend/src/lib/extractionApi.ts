import { api } from './api';
import type { ApiEnvelope, ExtractionAccount, ExtractionJob, SystemLogEntry, ExtractedNumber, Pagination } from '../types';

export const extractionApi = {
  createAccount: (payload: { name: string; description?: string }) =>
    api.post<ApiEnvelope<ExtractionAccount>>('/number-extraction/accounts', payload).then((r) => r.data.data),

  updateAccount: (id: string, payload: { name?: string; description?: string }) =>
    api.patch<ApiEnvelope<ExtractionAccount>>(`/number-extraction/accounts/${id}`, payload).then((r) => r.data.data),

  deleteAccount: (id: string) => api.delete(`/number-extraction/accounts/${id}`),

  startAccount: (id: string) => api.post(`/number-extraction/accounts/${id}/start`),

  stopAccount: (id: string) => api.post(`/number-extraction/accounts/${id}/stop`),

  triggerExtraction: (id: string) => api.post(`/number-extraction/accounts/${id}/extract`),

  fetchAccountJobs: (id: string) =>
    api.get<ApiEnvelope<ExtractionJob[]>>(`/number-extraction/accounts/${id}/jobs`).then((r) => r.data.data),

  fetchAccountLogs: (id: string) =>
    api.get<ApiEnvelope<SystemLogEntry[]>>(`/number-extraction/accounts/${id}/logs`).then((r) => r.data.data),

  fetchNumbers: (params: {
    page: number;
    pageSize: number;
    accountId?: string;
    countryIso?: string;
    status?: string;
    search?: string;
  }) =>
    api
      .get<ApiEnvelope<ExtractedNumber[]>>('/number-extraction/numbers', { params })
      .then((r) => ({ items: r.data.data, pagination: r.data.pagination as Pagination })),
};
