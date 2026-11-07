/* Activate exact concept sprites only after their single source atlas has loaded. */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 let requested=false;
 function load(){
  if(requested||root.innerWidth<900||!doc.documentElement.classList.contains('visual-v2'))return;
  requested=true;const atlas=doc.createElement('img');
  atlas.onload=()=>{if(atlas.naturalWidth===1672&&atlas.naturalHeight===941)doc.documentElement.classList.add('concept-finish-ready');};
  // On errors the original, fully functional controls stay visible.
  atlas.src='assets/visual-v2/skin/ui-concept-reference.png?v=1';
 }
 new root.MutationObserver(load).observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 root.addEventListener('resize',load);load();
})(typeof window==='undefined'?globalThis:window);
