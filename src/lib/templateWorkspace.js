import {validateFiles} from './files.js';
export function applyTemplateToWorkspace(store,files,name){
 validateFiles(files);
 if(!files['index.html']&&!files['package.json'])throw new Error('Template has no entry point.');
 store.newProject();store.setProjectFiles({...files});store.setProjectName(name);store.setActiveFile(files['src/App.jsx']?'src/App.jsx':'index.html');
}
