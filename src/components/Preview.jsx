import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, RefreshCw, Monitor, Smartphone, Tablet, Maximize, ExternalLink, Terminal } from 'lucide-react';
import {terminalText, withDeadline} from '../lib/runtimeOutput.js';
import { bootRuntime, disposeRuntime, fileTree } from '../lib/runtime.js';
import { buildStaticPreview, resolvePage } from '../lib/previewBuilder.js';
export default function Preview({
  files,
  projectId
}) {
  const [url, setUrl] = useState(''),
    [phase, setPhase] = useState('Stopped'),
    [logs, setLogs] = useState(''),
    [error, setError] = useState(''),
    [device, setDevice] = useState('desktop'),
    [consoleOpen, setConsoleOpen] = useState(false),
    [page, setPage] = useState('index.html'),
    [revision, setRevision] = useState(0);
  const processRef = useRef(null),
    runtime = useRef(null),
    epoch = useRef(0),
    unlisten = useRef([]),
    frame = useRef(null),
    latest = useRef(files);
  latest.current = files;
  const packaged = Object.prototype.hasOwnProperty.call(files, 'package.json');
  const srcDoc = useMemo(() => packaged ? undefined : buildStaticPreview(files, files[page] !== undefined ? page : 'index.html'), [files, page, packaged]);
  function log(text) {
    setLogs(s => (s + text).slice(-40000));
  }
  function stop() {
    epoch.current++;
    processRef.current?.kill();
    processRef.current = null;
    unlisten.current.forEach(fn => fn());
    unlisten.current = [];
    if (runtime.current) {
      disposeRuntime(runtime.current);
      runtime.current = null;
    }
    setUrl('');
    setPhase('Stopped');
  }
  useEffect(() => {
    stop();
    setPage('index.html');
    setLogs('');
    setError('');
    return stop;
  }, [projectId]);
  useEffect(() => {
    const listener = e => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== 'nexus-navigate') return;
      const resolved = resolvePage(e.data.href, latest.current);
      if (resolved) setPage(resolved);else setError(`Page not found: ${e.data.href}`);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
  async function run() {
    stop();
    const current = epoch.current;
    setError('');
    setLogs('');
    setConsoleOpen(true);
    setPhase('Booting');
    try {
      const snapshot = {
          ...latest.current
        },
        tree = fileTree(snapshot);
      const pkg = JSON.parse(snapshot['package.json']);
      const script = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
      if (!script) throw new Error('Add a dev or start script to package.json first.');
      const wc = await bootRuntime();
      if (current !== epoch.current) return;
      runtime.current = wc;
      const dir = `project-${crypto.randomUUID()}`;
      await wc.fs.mkdir(dir);
      await wc.mount(tree, {
        mountPoint: dir
      });
      if (current !== epoch.current) return;
      const cleanOutput = terminalText();
      const pipe = process => process.output.pipeTo(new WritableStream({
        write: text => {
          if (current === epoch.current) log(cleanOutput(text));
        }
      })).catch(() => {});
      setPhase('Installing');
      log('$ npm install\n');
      const install = await wc.spawn('npm', ['install', '--no-audit', '--no-fund', '--progress=false', '--color=false'], {
        cwd: dir, env: {CI: 'true', NO_COLOR: '1', npm_config_progress: 'false'}
      });
      if (current !== epoch.current) {
        install.kill();
        return;
      }
      processRef.current = install;
      pipe(install);
      const code = await withDeadline(install.exit, 180000, 'Package installation timed out. Your files are safe. Check your connection and retry Run project.', () => install.kill());
      if (current !== epoch.current) return;
      if (code !== 0) throw new Error(`Dependency installation failed (${code}). Check the logs.`);
      let ready;
      const started = new Promise(resolve => { ready = resolve; });
      unlisten.current.push(wc.on('server-ready', (port, address) => {
        if (current === epoch.current) {
          ready();
          setUrl(address);
          setPhase('Running');
          log(`\nListening on ${port}\n`);
        }
      }));
      unlisten.current.push(wc.on('preview-message', message => {
        if (current === epoch.current) log(`\nPreview: ${message.message || JSON.stringify(message.args || [])}\n`);
      }));
      setPhase('Starting');
      log(`$ npm run ${script}\n`);
      const proc = await wc.spawn('npm', ['run', script], {
        cwd: dir, env: {CI: 'true', NO_COLOR: '1', npm_config_progress: 'false'}
      });
      if (current !== epoch.current) {
        proc.kill();
        return;
      }
      processRef.current = proc;
      pipe(proc);
      await withDeadline(Promise.race([started, proc.exit.then(code => {throw new Error(`Server exited before preview was ready (${code}). Check the logs.`)})]), 60000, 'The server did not start within 60 seconds. Check its dev script and runtime output.', () => proc.kill());
      const exit = await proc.exit;
      if (current === epoch.current) {
        setPhase('Stopped');
        setUrl('');
        if (exit) setError(`Server exited (${exit}). Check the logs.`);
      }
    } catch (e) {
      if (current === epoch.current) {
        stop();
        setError(e.message);
        log(`\n${e.message}\n`);
      }
    }
  }
  const busy = phase !== 'Stopped';
  return <section className="preview-panel"><div className="preview-toolbar"><span className="live-dot" /><strong>Preview</strong><div className="spacer" />
    <button aria-label="Desktop preview" className={device==='desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}><Monitor size={15} /></button><button aria-label="Tablet preview" className={device==='tablet'?'active':''} onClick={()=>setDevice('tablet')}><Tablet size={15}/></button><button aria-label="Fullscreen preview" onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await frame.current?.requestFullscreen()}catch{setError('Fullscreen is unavailable in this browser.')}}}><Maximize size={15}/></button><button aria-label="Mobile preview" className={device==='mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}><Smartphone size={15} /></button><button aria-label="Refresh preview" onClick={() => setRevision(r => r + 1)}><RefreshCw size={14} /></button></div>
    <div className="address-bar"><span>◈</span><span>{url || (packaged ? 'Run your project to preview' : `preview / ${page}`)}</span>{url && <a href={url} target="_blank" rel="noreferrer" aria-label="Open running preview"><ExternalLink size={13} /></a>}</div>
    {packaged && <div className="runtime-actions"><button className="accent-button" onClick={busy ? stop : run}>{busy ? <Square size={13} /> : <Play size={13} />}{busy ? 'Stop' : 'Run project'}</button><span>{phase}</span><small>Re-run after edits</small></div>}
    {error && <div className="error" role="alert">{error}</div>}
    <div className={`preview-stage ${device}`}>{url || srcDoc ? <iframe key={`${revision}-${url}`} ref={frame} title="Project preview" src={url || undefined} srcDoc={url ? undefined : srcDoc} sandbox={url ? 'allow-scripts allow-forms allow-same-origin allow-popups allow-downloads' : 'allow-scripts allow-forms allow-popups'} allow="cross-origin-isolated" /> : <div className="empty"><div className="preview-symbol">↗</div><h3>Your app, running live.</h3><p>{packaged ? 'Run the project to install packages and start its Node server in your browser.' : 'Create an index.html file to see a preview.'}</p></div>}</div>
    <button className="console-toggle" onClick={() => setConsoleOpen(v => !v)}><Terminal size={13} />Runtime output <span className="spacer" />{consoleOpen ? '−' : '+'}</button>{consoleOpen && <pre className="runtime-console" aria-label="Runtime output">{logs || (packaged ? 'Ready. Click Run project.\nNode-compatible packages only. No Python or Docker runtime.' : 'Static preview • HTML, CSS and browser JavaScript.\nUse a Node project for backend APIs.')}</pre>}
  </section>;
}
