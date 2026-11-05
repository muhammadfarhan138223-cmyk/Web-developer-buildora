import React,{useRef} from 'react';
export default function ImportSource({onFiles,onError}){
 const input=useRef(),folder=useRef();
 async function load(e){try{const files={};for(const file of e.target.files){const path=file.webkitRelativePath?file.webkitRelativePath.split('/').slice(1).join('/'):file.name;if(/(^|\/)(node_modules|\.git|dist|\.env)(\/|\.|$)/.test(path))continue;if(!/\.(html?|css|[cm]?js|jsx|ts|tsx|vue|json|md|svg|txt)$/i.test(path))continue;if(file.size>500000)throw new Error('Source file is too large: '+path);files[path]=await file.text()}if(!Object.keys(files).length)throw new Error('No supported frontend source files found.');onFiles(files)}catch(error){onError(error.message)}finally{e.target.value=''}}
 return <><input hidden ref={input} type="file" multiple accept=".html,.htm,.css,.js,.mjs,.jsx,.ts,.tsx,.vue,.json,.svg,.md,.txt" onChange={load}/><input hidden ref={folder} type="file" multiple webkitdirectory="" onChange={load}/><button onClick={()=>input.current.click()}>Import source files</button><button onClick={()=>folder.current.click()}>Import folder</button></>
}
