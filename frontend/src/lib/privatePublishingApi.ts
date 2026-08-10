import { api } from './api';
export type PublishingOverview = { totalNumbers:number; contactedNumbers:number; remainingNumbers:number; activeAccounts:number; totalAccounts:number; activeCampaigns:number; totalCampaigns:number; pending:number; sent:number; failed:number };
export type PublishingAccount = { id:string; name:string; phoneNumber:string; status:string; sentCount:number; successCount:number; failedCount:number; dailyLimit:number; lastActivityAt:string|null; priority:number };
export async function getPublishingOverview(){ return (await api.get<{data:PublishingOverview}>('/private-publishing/overview')).data.data; }
export async function getPublishingAccounts(){ return (await api.get<{data:PublishingAccount[]}>('/private-publishing/accounts')).data.data; }
export async function getPublishingDeliveries(){ return (await api.get<{data:Array<{id:string;phoneNumber:string;status:string;createdAt:string;errorMessage:string|null}>}>('/private-publishing/deliveries?limit=25')).data.data; }
