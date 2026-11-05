import {loadEnv} from './http.mjs';
import {providerHealth} from './byok.js';
loadEnv();
console.log(`Buildora backend check — Node ${process.version}`);
for(const provider of ['gemini','openrouter']){
 try{const result=await providerHealth(provider);console.log(`${provider}: reachable (HTTP ${result.status}; credentials not tested)`)}
 catch(error){console.log(`${provider}: ${error.code} — ${error.message}`);process.exitCode=1}
}
console.log('No API key, account information or project content was sent.');
