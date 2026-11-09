import ImportSource from '../builder/ImportSource.jsx';
import PasteCode from '../builder/PasteCode.jsx';
import {extractChatFiles,arrangeFiles} from '../builder/chatFiles.js';
import {useBuilderDialog} from '../builder/useBuilderDialog.jsx';
import {scanProject} from '../lib/projectScanner.js';

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowUp, ArrowUpRight, Plus, Download, Upload, Sun, Moon, PanelsTopLeft, Code2, Eye, Database, Save, CloudDownload, X, Sparkles, Loader2, Folder, MessageSquare, MoreHorizontal, PanelLeftClose } from 'lucide-react';
import JSZip from 'jszip';
import { useStore } from '../store.js';
import { validateFiles, validPath, MAX_BYTES } from '../lib/files.js';
import {reactStarterFiles} from '../lib/reactStarter.js';
import { fullstackFiles } from '../lib/templates.js';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { saveProject, saveConversation, loadProjects, loadProject, loadConversations, deleteProject } from '../lib/database.js';
import { api } from '../lib/backend.js';
import { signOut } from '../lib/auth.js';
import CodeView from './CodeView.jsx';
import FrontendPreview from '../builder/FrontendPreview.jsx';
import './workspace.css';
import './studio.css';
import './coding-studio.css';
import '../builder/hybrid.css';
import '../builder/work-polish.css';
import ChatMessage from './ChatMessage.jsx';
import {usePreferences,aiCredentials} from '../lib/preferences.js';
export default function Builder() {
  const navigate=useNavigate(),location=useLocation(),prefs=usePreferences();
  const {confirm:confirmAction,prompt:promptAction,dialog}=useBuilderDialog();
  const [chats,setChats]=useState(()=>{try{return JSON.parse(localStorage.getItem('buildora-chat-library')||'[]')}catch{return []}});
  const [chatId,setChatId]=useState(null);
  useEffect(()=>{localStorage.setItem('buildora-chat-library',JSON.stringify(chats))},[chats]);
  const mode=location.pathname.endsWith('/chat')?'chat':'work';
  useEffect(()=>{document.title=(mode==='work'?'Work':'Chat')+' | Buildora'},[mode]);
  const [aiOpen,setAiOpen]=useState(false),[filesOpen,setFilesOpen]=useState(false),[workTab,setWorkTab]=useState('code'),[split,setSplit]=useState(48);
  const drawer=useRef(),splitArea=useRef();
  const [pasteOpen,setPasteOpen]=useState(false);
  useEffect(()=>{if(!['/builder','/builder/','/builder/chat','/builder/work'].includes(location.pathname))navigate('/builder/chat',{replace:true})},[location.pathname]);
  useEffect(()=>{if(!aiOpen)return;const previous=document.activeElement;drawer.current?.querySelector('textarea')?.focus();const key=e=>{if(e.key==='Escape'){setAiOpen(false);return}if(e.key==='Tab'){const elements=[...drawer.current.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled),input:not([hidden]):not(:disabled),summary')].filter(el=>el.getClientRects().length);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus()}},[aiOpen]);
  useEffect(()=>{const key=e=>{if(e.key==='Escape')setFilesOpen(false)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[]);
  const s = useStore(),
    [theme,setTheme]=useState(()=>localStorage.getItem('buildora-theme')||'dark'),
    [layout, setLayout] = useState('split'),
    [input, setInput] = useState(() => new URLSearchParams(window.location.search).get('prompt') || ''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(false),
    [cloud, setCloud] = useState(null),
    [history, setHistory] = useState(null),
    [review, setReview] = useState(null),
    [buildState,setBuildState] = useState(null),
    [recovery,setRecovery] = useState(null),[mobileView,setMobileView]=useState('chat'),[chatWidth,setChatWidth]=useState(330),[codeWidth,setCodeWidth]=useState(50),[attachments,setAttachments]=useState([]);
  const upload = useRef(),attachmentInput=useRef(),
    controller = useRef(),
    end = useRef(),
    busyRef = useRef(false);
  const locked = busy || !!review;
  useEffect(() => {
    localStorage.setItem('buildora-theme', theme);
  }, [theme]);
  useEffect(() => {
    if(!s.conversation.length&&!busy)return;
    end.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [s.conversation, busy]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const handler = () => setNotice('Browser storage is full or unavailable. Export your ZIP now; this workspace may not survive a reload.');
    window.addEventListener('buildora-storage-error', handler);
    return () => window.removeEventListener('buildora-storage-error', handler);
  }, []);
  function notifyError(e) {
    setNotice(e.message || 'Something went wrong.');
  }
  async function generate() {
    const message=input.trim();if(!message||busyRef.current)return;if(!s.user){navigate('/login?next=/builder/chat');return;}
    busyRef.current=true;setBusy(true);setInput('');setNotice('');setRecovery(null);setBuildState(null);
    const previous=s.conversation;const id=chatId||crypto.randomUUID();setChatId(id);
    s.addMessage({role:'user',content:message});controller.current=new AbortController();
    try{
      const session=await getSupabaseClient()?.auth.getSession();const token=session?.data?.session?.access_token;
      const result=await api('/api/chat',{method:'POST',signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(120000)]),headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify({mode:'conversation',message,conversationHistory:previous.slice(-12).map(m=>({role:m.role,content:(m.content||m.text||"").slice(0,6000)})),projectContext:{files:scanProject(s.projectFiles,message).files},connection:aiCredentials()})});
      s.addMessage({role:'assistant',content:result.content});
    }catch(e){setNotice(e.name==='AbortError'?'Response stopped. Your files are unchanged.':e.message);s.addMessage({role:'assistant',content:'The provider could not finish this response. Your files have not changed. You can send another message when ready.',isError:true})}
    finally{setChats(items=>{const old=items.find(c=>c.id===id);return [...items.filter(c=>c.id!==id),{...old,id,title:old?.title||message.slice(0,45),messages:useStore.getState().conversation}]});busyRef.current=false;setBusy(false)}
  }
  function stageAnswer(text){try{const changes=extractChatFiles(text);if(!Object.keys(changes).length)throw new Error('No complete frontend files found.');setReview({projectId:s.projectId,before:{...s.projectFiles},files:arrangeFiles(s.projectFiles,changes),operations:Object.entries(changes).map(([path,content])=>({type:'write',path,content})),text:'Only these files will be added or replaced. Other files stay unchanged.'})}catch(e){setNotice(e.message)}}
  async function manageChat(chat,action){if(action==='pin')setChats(items=>items.map(c=>c.id===chat.id?{...c,pinned:!c.pinned}:c));if(action==='rename'){const title=await promptAction('Conversation name',chat.title);if(title?.trim())setChats(items=>items.map(c=>c.id===chat.id?{...c,title:title.trim()}:c))}if(action==='delete'&&await confirmAction('Remove this conversation from this device? Project files stay unchanged.')){setChats(items=>items.filter(c=>c.id!==chat.id));if(chatId===chat.id){setChatId(null);s.setConversation([])}}}
  function accept() {
    if (!review || s.projectId !== review.projectId) return;
    try{localStorage.removeItem('buildora-build-checkpoint:'+s.projectId)}catch{}
    setHistory(review.before);
    s.setProjectFiles(review.files);
    s.setActiveFile(Object.keys(review.files).sort()[0] || null);
    s.addMessage({
      role: 'assistant',
      content: review.text || review.summary || 'Updated your project.',
      changed: review.operations.map(o => `${o.type}: ${o.path}`)
    });
    setReview(null);setBuildState(null);setRecovery(null);
    setAiOpen(false);setWorkTab('preview');navigate('/builder/work');
    setNotice('Changes applied. Your frontend preview updates automatically.');
  }
  async function newProject(fullstack = false) {
    if (!await confirmAction('Create a new project? Export or cloud-save your current work first.')) return;
    s.newProject();
    useStore.getState().setProjectFiles({'index.html':''});
    if (fullstack) {
      useStore.getState().setProjectFiles({
        ...(fullstack === 'react' ? reactStarterFiles : fullstackFiles)
      });
      useStore.getState().setProjectName(fullstack === 'react' ? 'Forma / React studio' : 'Notes / Full-stack starter');
    }
    setHistory(null);
    setNotice('');
  }
  async function exportZip() {
    if(!s.user){navigate("/signup?next=/builder&intent=export");return;}
    try {
      const session=await getSupabaseClient()?.auth.getSession();
      const token=session?.data?.session?.access_token;
      const {archive}=await api('/api/export',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify({files:s.projectFiles})});
      const bytes=Uint8Array.from(atob(archive),c=>c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),
        a = document.createElement('a');
      a.href = url;
      a.download = `${s.projectName.replace(/[^a-z0-9_-]/gi, '-') || 'buildora-project'}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      notifyError(e);
    }
  }
  async function importZip(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_BYTES) throw new Error('Choose a ZIP smaller than 3 MB without node_modules.');
      const zip = await JSZip.loadAsync(file),
        entries = Object.values(zip.files).filter(f => !f.dir && !/(^|\/)(node_modules|\.git|dist)\//.test(f.name) && !/(^|\/)\.env(\.|$)/.test(f.name));
      if (!entries.length || entries.length > 400) throw new Error('ZIP must contain 1–400 source files.');
      const wrapper = entries.every(f => f.name.includes('/') && f.name.split('/')[0] === entries[0].name.split('/')[0]) ? entries[0].name.split('/')[0] + '/' : '';
      const files = {};
      let total = 0;
      for (const entry of entries) {
        const path = entry.name.slice(wrapper.length);
        if (!validPath(path) || entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) throw new Error('ZIP contains an unsafe path.');
        const bytes = await new Promise((resolve, reject) => {
          const chunks = [];
          let size = 0;
          const stream = entry.internalStream('uint8array');
          stream.on('data', chunk => {
            size += chunk.length;
            total += chunk.length;
            if (total > MAX_BYTES) {
              stream.pause();
              reject(new Error('Expanded ZIP exceeds 3 MB.'));
            } else chunks.push(chunk);
          }).on('error', reject).on('end', () => {
            const result = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            resolve(result);
          }).resume();
        });
        const binary = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf)$/i.test(path);
        if (binary) {
          let raw = '';
          for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
          const ext = path.split('.').pop().toLowerCase();
          const mime = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            ico: 'image/x-icon',
            woff: 'font/woff',
            woff2: 'font/woff2',
            ttf: 'font/ttf',
            pdf: 'application/pdf'
          };
          files[path] = `data:${mime[ext]};base64,${btoa(raw)}`;
        } else files[path] = new TextDecoder('utf-8', {
          fatal: true
        }).decode(bytes);
      }
      validateFiles(files);
      if (!await confirmAction('Replace the current workspace with this ZIP? Export your work first if needed.')) return;
      s.newProject();
    useStore.getState().setProjectFiles({'index.html':''});
      useStore.getState().setProjectFiles(files);
      useStore.getState().setProjectName(file.name.replace(/\.zip$/i, ''));
      s.setActiveFile(Object.keys(files).sort()[0]);
      setHistory(null);
      setNotice(`Imported ${Object.keys(files).length} files.`);
    } catch (err) {
      notifyError(err);
    }
  }
  async function save() {
    if (!s.user) {navigate('/signup?next=/builder&intent=save');return;}
    try {
      const result = await saveProject(s.user.id, {
        id: s.projectId,
        name: s.projectName,
        files: s.projectFiles
      });
      if (result.error) throw result.error;
      const conversation = await saveConversation(s.user.id, s.projectId, s.conversation);
      if (conversation.error) throw conversation.error;
      setNotice('Project and conversation saved to your account.');
    } catch (e) {
      notifyError(e);
    }
  }
  async function showCloud() {
    if (!s.user) return setNotice('Sign in to browse your saved projects.');
    try {
      const result = await loadProjects(s.user.id);
      if (result.error) throw result.error;
      setCloud(result.data);
    } catch (e) {
      notifyError(e);
    }
  }
  async function openCloud(id) {
    try {
      const {
        data,
        error
      } = await loadProject(id);
      if (error) throw error;
      validateFiles(data.files);
      const chats = await loadConversations(s.user.id, id);
      if (chats.error) throw chats.error;
      if (!await confirmAction('Open this saved project and replace the current workspace?')) return;
      s.setProject(data);
      s.setConversation(chats.data?.[0]?.messages || []);
      s.setActiveFile(Object.keys(data.files).sort()[0] || null);
      setCloud(null);
      setHistory(null);
      setNotice('Saved project loaded.');
    } catch (e) {
      notifyError(e);
    }
  }
  const aiPanel=<aside className="chat-panel"><div className="chat-heading"><span className="assistant-icon"><Sparkles size={17} /></span><div><strong>Buildora assistant</strong><small>Design · develop · refine</small></div><small>{prefs.apiKey ? prefs.model || "Choose model" : s.backendConfig?.aiConfigured ? "AI configured" : "AI setup needed"}</small>{mode==='work'&&<button aria-label="Close AI drawer" onClick={()=>setAiOpen(false)}><X size={19}/></button>}</div>
      <div className="conversation">{!s.conversation.length&&<section className="hybrid-welcome"><span className="ai-emblem"><Sparkles size={30}/></span><p className="hybrid-eyebrow">YOUR PERSONAL WEBSITE BUILDING ASSISTANT</p><h1>Hello, I'm Buildora AI<span>.</span></h1><p>Turn an idea into a frontend you can edit.<br/>Ask, review and make it yours.</p><div className="hybrid-suggestions">{[[Sparkles,'Create a website','Describe your next idea','Build a responsive React portfolio with Home, Work, About and Contact. Use thoughtful typography, imported CSS and accessible mobile navigation.'],[Code2,'Improve my code','Refine the details',`Improve ${s.activeFile||'my frontend'}. Preserve working features and check relative imports.`],[MessageSquare,'Explain this code','Learn step by step',`Explain how ${s.activeFile||'this project'} works, then suggest a small useful improvement.`],[PanelsTopLeft,'Start with React','A working foundation','starter']].map(([Icon,title,desc,prompt])=><button key={title} disabled={locked} onClick={()=>prompt==='starter'?newProject('react'):setInput(prompt)}><Icon size={20}/><strong>{title}</strong><small>{desc}</small></button>)}</div></section>}
      {s.conversation.map(m => <article key={m.id} className={`message ${m.role}`}><div className="message-author">{m.role === 'user' ? 'YOU' : 'BUILDORA'}</div><ChatMessage text={m.text || m.content}/>{m.role==='assistant'&&!m.isError&&/```/.test(m.content||m.text||'')&&<button className="accent-button" onClick={()=>stageAnswer(m.content||m.text)}>Review & apply files to Work</button>}{m.changed?.map((p, i) => <code key={i}>{p}</code>)}</article>)}
      {buildState && <section className="build-journey" aria-label="Build progress"><div><strong>{buildState.phase}</strong><span>{buildState.total ? `${buildState.done} / ${buildState.total} files` : 'Creating your blueprint'}</span></div>{buildState.total>0&&<progress max={buildState.total} value={buildState.done} aria-label="Completed files"/>}<ol>{['Plan','Create','Review','Preview'].map((label,i)=><li key={label} className={(buildState.phase==='Ready to review'?i<=2:buildState.total?i<=1:i===0)?'current':''}>{label}</li>)}</ol>{buildState.paths&&<details><summary>View file plan</summary>{buildState.paths.map((path,i)=><p key={path}>{i<buildState.done?'✓':'○'} {path}</p>)}</details>}</section>}
      {recovery&&!busy&&<section className="build-recovery"><strong>Your work is still here.</strong><p>Resume completed steps, or choose another available model in settings.</p><button className="accent-button" onClick={()=>generate(recovery.message)}>Resume build <ArrowUpRight size={14}/></button><Link to="/settings">AI settings</Link><details><summary>Technical details</summary><p>{recovery.detail}</p></details></section>}
      {busy && <div className="working"><Loader2 size={15} className="spin" />Thinking…<button onClick={() => controller.current?.abort()}>Stop</button></div>}
      {review && <div className="review"><strong>Review proposed changes</strong><p>{review.text || review.summary}</p>{review.operations.map((op, i) => <details key={i}><summary>{op.type} · {op.path}</summary><pre>{op.content || '(Delete file)'}</pre></details>)}<div><button className="accent-button" onClick={accept}>Apply changes</button><button onClick={() => {try{localStorage.removeItem('buildora-build-checkpoint:'+s.projectId)}catch{}setReview(null);setNotice('Proposed changes discarded.')}}>Discard</button></div></div>}<div ref={end} /></div>
      <div className="composer"><input ref={attachmentInput} type="file" accept=".txt,.md,.html,.css,.js,.jsx,.ts,.tsx,.json" multiple hidden onChange={async e=>{const picks=[...e.target.files];e.target.value='';try{if(attachments.length+picks.length>3)throw new Error('Attach up to 3 text files.');const loaded=[];for(const file of picks){if(file.size>12000||!validPath(file.name)||!/\.(txt|md|html|css|js|jsx|ts|tsx|json)$/i.test(file.name))throw new Error('Choose source or text files under 12 KB.');loaded.push({name:file.name,content:await file.text()})}setAttachments(items=>[...items,...loaded])}catch(error){setNotice(error.message)}}}/>{attachments.length>0&&<div className="attachment-list">{attachments.map((a,i)=><button key={a.name+i} disabled={locked} onClick={()=>setAttachments(items=>items.filter((_,n)=>n!==i))}>{a.name} ×</button>)}</div>}<textarea aria-label="Message Buildora" value={input} maxLength={20000} disabled={locked} onChange={e => setInput(e.target.value)} placeholder="Ask anything, or ask me to write code…" onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              generate();
            }
          }} /><div><span><button type="button" aria-label="Attach reference file" disabled={locked} onClick={()=>attachmentInput.current?.click()}><Upload size={13}/></button>Your creative brief</span><button aria-label="Send message" className="send-button" disabled={locked || !input.trim()} onClick={generate}><ArrowUp size={18} /></button></div></div><div className="chat-tools"><button disabled={locked||!s.activeFile} onClick={()=>setInput(`Improve ${s.activeFile}. Preserve its existing behavior and check related imports.`)}>Edit selected file</button><button disabled={locked||!s.conversation.length} onClick={()=>{const last=[...s.conversation].reverse().find(m=>m.role==='user');if(last)setInput(last.content||last.text)}}>Regenerate</button><button disabled={locked||!s.conversation.length} onClick={async()=>{if(await confirmAction('Clear this conversation? Your project files will stay.'))s.setConversation([])}}>Clear chat</button></div><div className="chat-footnote">Enter to send · Shift + Enter for a new line</div></aside>;
  return <div className="workspace hybrid-builder" data-mode={mode} data-work-tab={workTab} data-theme={theme} data-brand-theme={prefs.theme}>
    <header className="hybrid-nav"><Link to="/" className="hybrid-brand" aria-label="Buildora homepage"><img src={'/brand/mark-'+prefs.theme+'.svg'} alt=""/>buildora</Link><nav className="hybrid-mode" aria-label="Builder mode"><Link to="/builder/chat" aria-current={mode==='chat'?'page':undefined}>Chat</Link><Link to="/builder/work" aria-current={mode==='work'?'page':undefined}>Work</Link></nav><div className="hybrid-nav-actions"><button aria-label="Switch builder theme" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button><Link className="hybrid-model-link" to="/settings">AI settings</Link><button aria-label="Profile" onClick={()=>s.user?setSettings(true):navigate('/login?next=/builder/work')}><span className="hybrid-avatar">P</span></button></div></header>
    <input type="file" hidden accept=".zip" ref={upload} onChange={importZip}/>{pasteOpen&&<PasteCode onClose={()=>setPasteOpen(false)} onApply={files=>{setHistory({...s.projectFiles});s.setProjectFiles(files);s.setActiveFile(Object.keys(files)[0]);setWorkTab('preview');setNotice('Code detected and arranged. Use Undo AI change to restore your previous files.')}}/>}
    {(s.backendError||notice)&&<div className="hybrid-notice" role="status"><span>{s.backendError||notice}</span><button aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={14}/></button></div>}
    {!s.backendError&&!prefs.apiKey&&!s.backendConfig?.aiConfigured&&<div className="hybrid-key-note">Your editor and preview are ready. <Link to="/settings">Connect an AI model</Link> to generate code.</div>}
    {mode==='chat'?<main id="builder-main" className="hybrid-chat-view"><aside className="hybrid-history"><button className="new-chat" disabled={locked} onClick={async()=>{if(await confirmAction('Start a fresh conversation? Project files will stay.')){setChatId(null);s.setConversation([])}}}><Plus size={16}/>New chat</button><span>CONVERSATIONS</span>{[...chats].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)).map(chat=><div key={chat.id} className="chat-library-row"><button disabled={busy} onClick={()=>{setChatId(chat.id);s.setConversation(chat.messages||[])}}><MessageSquare size={14}/><span>{chat.pinned?'★ ':''}{chat.title}</span></button><details><summary aria-label={'Manage '+chat.title}>⋯</summary><button onClick={()=>manageChat(chat,'rename')}>Rename</button><button onClick={()=>manageChat(chat,'pin')}>{chat.pinned?'Unpin':'Pin'}</button><button onClick={()=>manageChat(chat,'delete')}>Delete</button></details></div>)}<div className="hybrid-history-bottom"><button disabled={locked} onClick={showCloud}><CloudDownload size={15}/>Saved projects</button><button disabled={locked} onClick={()=>upload.current?.click()}><Upload size={15}/>Import ZIP</button><button disabled={locked} onClick={()=>newProject()}><Plus size={15}/>New project</button><Link to="/settings">Provider & model ↗</Link></div></aside><div className="hybrid-chat-center">{aiPanel}</div></main>:<main id="builder-main" className="hybrid-work-view"><div className="hybrid-project-bar"><div className="hybrid-project-title"><FileIcon/><input aria-label="Project name" value={s.projectName} maxLength={80} disabled={locked} onChange={e=>s.setProjectName(e.target.value)}/></div><div className="hybrid-project-actions"><button className={filesOpen?'selected':''} aria-label="Toggle project files" aria-expanded={filesOpen} onClick={()=>{setFilesOpen(v=>!v);setWorkTab('code')}}><Folder size={16}/><span>Files</span></button><button onClick={()=>setPasteOpen(true)} aria-label="Paste code to preview"><Code2 size={16}/><span>Paste code</span></button><button aria-label="Ask AI" aria-expanded={aiOpen} onClick={()=>setAiOpen(true)}><Sparkles size={16}/><span>Ask AI</span></button><button aria-label="Save project" onClick={save} disabled={locked}><Save size={16}/><span>Save</span></button><details className="hybrid-more"><summary aria-label="Project actions"><MoreHorizontal size={18}/></summary><div><ImportSource onError={setNotice} onFiles={files=>{setHistory({...s.projectFiles});s.setProjectFiles({...s.projectFiles,...files});setNotice("Source files imported. Preview updates automatically.")}}/><button disabled={locked} onClick={()=>upload.current?.click()}><Upload size={14}/>Import ZIP</button><button onClick={exportZip}><Download size={14}/>Export ZIP</button><button disabled={locked} onClick={showCloud}><CloudDownload size={14}/>Saved projects</button><button disabled={locked} onClick={()=>newProject()}><Plus size={14}/>New project</button>{history&&<button disabled={locked} onClick={()=>{s.setProjectFiles(history);setHistory(null);setNotice('Restored files from before the last AI change.')}}>Undo AI change</button>}</div></details><button className="hybrid-export accent-button" onClick={exportZip}><Download size={15}/><span>Export ZIP</span></button></div></div><nav className="hybrid-work-tabs" aria-label="Mobile work panels"><button aria-pressed={workTab==='code'} onClick={()=>setWorkTab('code')}><Code2 size={15}/>Code</button><button aria-pressed={workTab==='preview'} onClick={()=>{setWorkTab('preview');setFilesOpen(false)}}><Eye size={15}/>Preview</button></nav><div className="hybrid-work-panels" ref={splitArea} style={{'--editor-share':split+'%'}}><div className="hybrid-code"><CodeView files={s.projectFiles} activeFile={s.activeFile} setActiveFile={s.setActiveFile} theme={theme} locked={locked} explorerOpen={filesOpen} onCloseExplorer={()=>setFilesOpen(false)} onSave={save}/></div><div className="hybrid-resizer" role="separator" tabIndex={0} aria-label="Resize editor and preview" aria-orientation="vertical" aria-valuemin={28} aria-valuemax={72} aria-valuenow={Math.round(split)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setSplit(n=>Math.max(28,Math.min(72,n+(e.key==='ArrowLeft'?-2:2))))}}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const rect=splitArea.current.getBoundingClientRect();setSplit(Math.max(28,Math.min(72,(e.clientX-rect.left)/rect.width*100)))}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}/><div className="hybrid-preview"><FrontendPreview files={s.projectFiles} projectId={s.projectId} activeFile={s.activeFile}/></div></div></main>}
    {mode==='work'&&aiOpen&&<><button className="ai-drawer-backdrop" aria-label="Dismiss AI drawer" onClick={()=>setAiOpen(false)}/><section ref={drawer} className="hybrid-ai-drawer" role="dialog" aria-modal="true" aria-label="Ask Buildora AI">{aiPanel}</section></>}
    {settings && <div className="modal-overlay"><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="workspace-modal"><button className="modal-close" aria-label="Close settings" onClick={() => setSettings(false)}><X size={18}/></button><h2 id="settings-title">Your account & backend</h2><p>{s.backendConfig?.authProvider === 'local' ? 'Accounts and saved projects are stored on this server.' : 'Supabase account backend.'}</p><p>{s.user?.email || 'Sign in to save projects.'}</p><Link to="/guide">Setup and AI guide</Link>{s.user ? <button disabled={locked} onClick={async()=>{const result=await signOut();if(result.error)notifyError(result.error);else {setSettings(false);setNotice('Signed out. Saved projects remain in your account.')}}}>Sign out</button> : <Link to="/login">Sign in</Link>}</section></div>}
    {cloud && <div className="modal-overlay"><section role="dialog" aria-modal="true" aria-labelledby="cloud-title" className="workspace-modal"><button className="modal-close" aria-label="Close projects" onClick={() => setCloud(null)}><X size={18} /></button><h2 id="cloud-title">Your saved projects</h2>{cloud.length ? cloud.map(p => <div key={p.id}><button className="cloud-project" onClick={() => openCloud(p.id)}>{p.name}<ArrowUpRight size={15} /></button><button onClick={async()=>{if(!await confirmAction(`Delete saved project "${p.name}"?`))return;const result=await deleteProject(p.id);if(result.error)notifyError(result.error);else setCloud(items=>items.filter(item=>item.id!==p.id))}}>Delete</button></div>) : <p>No projects saved yet. Use Save to create your first one.</p>}</section></div>}
    {dialog}</div>;
}
function FileIcon(){return <span className="hybrid-file-icon"><Code2 size={17}/></span>}
