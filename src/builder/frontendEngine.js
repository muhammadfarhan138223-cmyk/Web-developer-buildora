let runtime;
export async function frontendEngine(){
 if(!runtime)runtime=(async()=>{
  const moduleUrl='/builder-runtime/esbuild.js';
  const esbuild=await import(/* @vite-ignore */ moduleUrl);
  await esbuild.initialize({wasmURL:'/builder-runtime/esbuild.wasm',worker:true});
  const [vendor,adapters]=await Promise.all([fetch('/builder-runtime/vendor.js'),fetch('/builder-runtime/adapters.json')]);
  if(!vendor.ok||!adapters.ok)throw new Error('Frontend compiler assets are unavailable. Reload the local preview.');
  const vueUrl='/builder-runtime/vue-compiler.js';const vueCompiler=await import(/* @vite-ignore */ vueUrl);const [vue,tailwind]=await Promise.all([fetch('/builder-runtime/vue.js'),fetch('/builder-runtime/tailwind.js')]);if(!vue.ok||!tailwind.ok)throw new Error('Framework preview assets unavailable.');return {vueCompiler,vueSource:await vue.text(),tailwindSource:await tailwind.text(),build:esbuild.build,vendorSource:await vendor.text(),adapters:await adapters.json()};
 })().catch(e=>{runtime=null;throw e});return runtime;
}
