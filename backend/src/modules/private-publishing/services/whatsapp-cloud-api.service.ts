import { env } from '../../../config/env.js';
export type TemplateMessage = { name:string; languageCode:string; components?:Array<{type:'header'|'body'|'button'; parameters?:Array<{type:'text'|'image'|'document'|'video'; text?:string; image?:{link:string}; document?:{link:string}; video?:{link:string}}>}>, };
export async function sendApprovedTemplate(input:{phoneNumberId:string; accessToken:string; recipient:string; template:TemplateMessage}) {
  const response=await fetch(`${env.WHATSAPP_GRAPH_API_BASE_URL}/${env.WHATSAPP_API_VERSION}/${input.phoneNumberId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${input.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:input.recipient,type:'template',template:{name:input.template.name,language:{code:input.template.languageCode},components:input.template.components}})});
  const payload=await response.json() as {messages?:Array<{id:string}>;error?:{message?:string;code?:string}};
  if(!response.ok) throw new Error(`${payload.error?.code??'WHATSAPP_API_ERROR'}: ${payload.error?.message??'Cloud API request failed'}`);
  return payload.messages?.[0]?.id ?? null;
}
