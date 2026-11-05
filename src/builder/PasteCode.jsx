import React,{useState} from 'react';
import {detectCode,extractChatFiles} from './chatFiles.js';
export default function PasteCode({onApply,onClose}){
 const [text,setText]=useState(''),[error,setError]=useState('');
 return <div className="builder-dialog-layer"><section role="dialog" aria-modal="true" aria-label="Paste code"><h2>Paste code. See it work.</h2><p>HTML, CSS, Tailwind, JavaScript, React, Vue, TypeScript or Markdown code blocks. File names are detected automatically. Backend code cannot run here.</p><textarea aria-label="Code to preview" value={text} onChange={e=>setText(e.target.value)} style={{width:'100%',height:240,background:'#080e1d',color:'#eee',fontFamily:'monospace'}}/>{error&&<p role="alert">{error}</p>}<button onClick={onClose}>Cancel</button><button onClick={()=>{try{let files=extractChatFiles(text);if(!Object.keys(files).length){const code=detectCode(text);files={[code.path]:code.content}}onApply(files);onClose()}catch(e){setError(e.message)}}}>Arrange & preview</button></section></div>
}
