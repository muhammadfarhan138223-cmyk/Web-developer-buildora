import { authorize, enforceLimit } from './access.js';
import { validateFiles } from '../src/lib/files.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export async function githubAction(req){
  const user=await authorize(req,true);if(!enforceLimit('github:'+user))fail('Please wait before another GitHub request.',429);
  const {token,action,owner,repo,branch,files,message}=req.body;
  if(typeof token!=='string'||!token||token.length>4096||/[\r\n]/.test(token))fail('Enter your GitHub access token in Connections.');
  async function gh(endpoint,body,method){
    const response=await fetch('https://api.github.com'+endpoint,{method:method||(body?'POST':'GET'),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});
    const result=await response.json().catch(()=>({}));if(!response.ok)fail(response.status===409?'Initialize the repository with a README on GitHub first.':'GitHub rejected the request. Check the repository, branch and token permissions.',400);return result;
  }
  if(action==='verify'){const data=await gh('/user');return {login:data.login}}
  if(!/^[\w.-]+$/.test(owner||'')||!/^[\w.-]+$/.test(repo||'')||typeof branch!=='string'||!branch||branch.length>200)fail('Enter owner, repository and an existing branch.');
  const prefix=`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  if(action==='inspect'){const data=await gh(prefix);return {name:data.full_name,defaultBranch:data.default_branch,url:data.html_url}}
  if(action!=='commit')fail('Unknown GitHub action.');
  try{validateFiles(files)}catch(e){fail(e.message)}
  const entries=Object.entries(files);if(entries.length>100)fail('Direct GitHub commits support 100 files. Use ZIP for larger projects.');
  if(entries.some(([p])=>p.startsWith('.github/workflows/')))fail('Export workflow files and review them locally before publishing.');
  const ref=await gh(prefix+'/git/ref/heads/'+encodeURIComponent(branch));
  const parent=await gh(prefix+'/git/commits/'+ref.object.sha);
  const tree=[];
  for(const [file,content] of entries){
    const binary=content.match(/^data:[^;]+;base64,(.*)$/s);
    if(binary){const blob=await gh(prefix+'/git/blobs',{content:binary[1],encoding:'base64'});tree.push({path:file,mode:'100644',type:'blob',sha:blob.sha})}
    else tree.push({path:file,mode:'100644',type:'blob',content});
  }
  const next=await gh(prefix+'/git/trees',{base_tree:parent.tree.sha,tree});
  const commit=await gh(prefix+'/git/commits',{message:String(message||'Update project from Buildora').slice(0,200),tree:next.sha,parents:[ref.object.sha]});
  await gh(prefix+'/git/refs/heads/'+encodeURIComponent(branch),{sha:commit.sha,force:false},'PATCH');
  return {url:`https://github.com/${owner}/${repo}/commit/${commit.sha}`,editor:`https://vscode.dev/github/${owner}/${repo}/tree/${encodeURIComponent(branch)}`};
}
