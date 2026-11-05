export function transformVue(source,filename,compiler){
 if(!compiler)throw new Error('Vue compiler is unavailable. Reload to load the preview assets.');
 const {descriptor:d,errors}=compiler.parse(source,{filename});if(errors.length)throw new Error(String(errors[0]));
 const id='data-v-'+Array.from(filename).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0).toString(16);
 if(d.template?.lang&&d.template.lang!=='html'||d.styles.some(s=>s.lang&&s.lang!=='css'))throw new Error('Vue preview supports HTML templates and CSS styles; convert Pug/Sass/Less before importing.');
 let code='const __sfc__={};',loader='js';
 if(d.script||d.scriptSetup){const script=compiler.compileScript(d,{id,inlineTemplate:!!d.scriptSetup,genDefaultAs:'__sfc__',isProd:true});code=script.content;loader=script.lang==='ts'?'ts':'js';}
 if(d.template&&!d.scriptSetup){const template=compiler.compileTemplate({source:d.template.content,filename,id,scoped:d.styles.some(s=>s.scoped),isProd:true});if(template.errors.length)throw new Error(String(template.errors[0]));code+='\n'+template.code.replace('export function render','function render')+'\n__sfc__.render=render;';}
 const css=d.styles.map(s=>{const result=compiler.compileStyle({source:s.content,filename,id,scoped:s.scoped});if(result.errors.length)throw result.errors[0];return result.code}).join('\n');
 if(d.styles.some(s=>s.scoped))code+=`\n__sfc__.__scopeId=${JSON.stringify(id)};`;
 return {code:code+'\nexport default __sfc__;',css,loader};
}
