import {validateFiles} from '../lib/files.js';
export function detectCode(source,hint=''){
 const text=source.trim();let extension;
 if(/<\?php|^\s*(from\s+\w+\s+import|def\s+\w+\(|package\s+\w+;|#include)/m.test(text)||/\b(require\(['"]express|app\.listen\(|createServer\()/.test(text))throw new Error('This is backend code. Work previews browser frontend code only.');
 if(/^\s*<template[\s>]/.test(text)||/<script\s+setup\b/.test(text))extension='vue';
 else if(/^(?:<!doctype|<html\b|<body\b|<head\b)/i.test(text))extension='html';
 else if(/^<(?!template\b|script\b)[a-z][\w-]*(?:\s|>)/i.test(text))extension='html';
 else if(/<[A-Za-z][\w.-]*(?:\s|>|\/)/.test(text)&&(/\breturn\s*\(?\s*<|=>\s*\(?\s*<|=\s*\(?\s*</.test(text)))extension=/\b(interface|type)\s+\w+|useState<|:\s*(string|number|boolean)\b/.test(text)?'tsx':'jsx';
 else if(/^[\s\S]*[.#@\w\[\]-][^{}]*\{[^{}]*[\w-]+\s*:[^{}]+\}/.test(text)&&! /\b(const|function|import|export)\b/.test(text))extension='css';
 else if(/\b(interface|type)\s+\w+|:\s*(string|number|boolean)\b/.test(text))extension='ts';
 else if(/\b(const|let|var|function|document|window|console|alert|setTimeout|setInterval|import|export)\b|=>/.test(text))extension='js';
 else if(/<\w+[\s>]/.test(text))extension='html';
 else if(/^(html|css|javascript|js|jsx|typescript|ts|tsx)$/.test(hint))extension=({javascript:'js',typescript:'ts'}[hint]||hint);
 else throw new Error('Code type was not recognized. Paste complete HTML, CSS, JavaScript, JSX, TypeScript or TSX.');
 return {path:extension==='html'?'index.html':extension==='css'?'styles.css':['jsx','tsx','vue'].includes(extension)?'src/App.'+extension:'main.'+extension,content:source,language:extension};
}
export function extractChatFiles(text){
 if((text.match(/```/g)||[]).length%2)throw new Error('This response has an unfinished code block. Ask the model to finish it before applying files.');
 const files={};const blocks=[...text.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)];
 for(const block of blocks){let header=block[1].trim(),path=header.match(/(?:file(?:name)?|path)=["']?([^\s"']+)/i)?.[1]||header.split(/\s+/).find(p=>/\.[a-z0-9]+$/i.test(p));
  if(!path){const before=text.slice(0,block.index).split('\n').slice(-3).join('\n');path=before.match(/(?:^|\n)\s*(?:#{1,4}\s*)?`?([\w@./-]+\.(?:html|css|js|jsx|ts|tsx|json|md))`?\s*:?\s*$/)?.[1]}
  try{const detected=path?{path,content:block[2]}:detectCode(block[2],header);if(Object.hasOwn(files,detected.path))throw new Error('Multiple blocks need unique filenames.');files[detected.path]=detected.content}catch(error){if(path)throw error;}
 }
 if(Object.keys(files).length)validateFiles(files);return files;
}
export function arrangeFiles(existing,incoming){return validateFiles({...existing,...incoming});}
