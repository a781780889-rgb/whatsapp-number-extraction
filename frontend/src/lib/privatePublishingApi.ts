import { api } from './api';
export type PublishingOverview = { totalNumbers:number; contactedNumbers:number; remainingNumbers:number; activeAccounts:number; totalAccounts:number; activeCampaigns:number; totalCampaigns:number; pending:number; sent:number; failed:number };
export type PublishingAccount = { id:string; name:string; phoneNumber:string; status:string; sentCount:number; successCount:number; failedCount:number; lastActivityAt:string|null };
export type CreatePublishingAccountInput = { name:string; phoneNumber:string; phoneNumberId:string; businessAccountId:string; accessToken:string };
export type EmbeddedSignupResult = { name:string; phoneNumber:string; phoneNumberId:string; businessAccountId:string; code:string };
export async function getPublishingOverview(){ return (await api.get<{data:PublishingOverview}>('/private-publishing/overview')).data.data; }
export async function getPublishingAccounts(){ return (await api.get<{data:PublishingAccount[]}>('/private-publishing/accounts')).data.data; }
export async function createPublishingAccount(input:CreatePublishingAccountInput){ return (await api.post<{data:PublishingAccount}>('/private-publishing/accounts',input)).data.data; }
export async function getEmbeddedSignupConfig(){ return (await api.get<{data:{appId:string;configId:string;apiVersion:string;configured:boolean}}>('/private-publishing/embedded-signup/config')).data.data; }
export async function completeEmbeddedSignup(input:EmbeddedSignupResult){ return (await api.post<{data:PublishingAccount}>('/private-publishing/accounts/embedded-signup',input)).data.data; }
export async function getPublishingDeliveries(){ return (await api.get<{data:Array<{id:string;phoneNumber:string;status:string;createdAt:string;errorMessage:string|null}>}>('/private-publishing/deliveries?limit=25')).data.data; }
