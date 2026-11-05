export function networkError(error){
 const code=error?.cause?.code||error?.code||'',name=error?.name;
 let message='The server could not connect to this provider. Check its internet connection and try again.',kind='PROVIDER_NETWORK';
 if(['EACCES','EPERM'].includes(code)){kind='NETWORK_BLOCKED';message='This Buildora server is blocked from accessing the internet. If started by a restricted coding tool, start START-BUILDORA.cmd yourself in Windows, or run npm start in your own terminal. No API key change is needed for this network error.'}
 else if(['ENOTFOUND','EAI_AGAIN'].includes(code)){kind='DNS_FAILED';message='The server could not resolve the provider address. Check DNS and internet connectivity.'}
 else if(['CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN'].includes(code)){kind='TLS_FAILED';message='The server could not verify the provider TLS certificate. Check the system clock and trusted certificates. Do not disable certificate verification.'}
 else if(['TimeoutError','AbortError'].includes(name)||['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(code)){kind='PROVIDER_TIMEOUT';message='The provider connection timed out. Your project was not changed. Try again or choose another provider.'}
 return Object.assign(new Error(message),{status:kind==='PROVIDER_TIMEOUT'?504:502,code:kind});
}
export function providerError(status,data){
 const reason=data?.error?.status||'';
 const detail=typeof data?.error?.message==='string'?data.error.message.toLowerCase():'';
 let message='The provider rejected the request. Check the selected model and your account access.',code='PROVIDER_REJECTED';
 if(status===401||detail.includes('api key not valid')||detail.includes('api_key_invalid')){message='The provider rejected this API key. Create or copy a valid key from the selected provider account.';code='INVALID_API_KEY'}
 else if(status===403){message='The provider denied access. Check API-key restrictions, project/API permissions and regional availability in your provider account.';code='PROVIDER_FORBIDDEN'}
 else if(status===429){message='Your provider quota or rate limit was reached. Check its usage/billing dashboard or choose another available model.';code='PROVIDER_QUOTA'}
 else if(status===404||reason==='NOT_FOUND'){message='This model was not found for your key. Use Test & load models and select an exact model ID returned by the provider.';code='MODEL_NOT_FOUND'}
 else if(status>=500){message='The provider is temporarily unavailable. Try again shortly or choose another provider.';code='PROVIDER_UNAVAILABLE'}
 return Object.assign(new Error(message),{status:status===429?429:status>=500?503:400,code});
}
