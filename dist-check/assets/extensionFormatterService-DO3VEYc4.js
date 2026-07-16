const u=new Set(["esbenp.prettier-vscode"]),m=new Set(["javascript","typescript","javascriptreact","typescriptreact","json","html","css","scss","less","markdown","yaml"]);let p=!1;function y(t,n){if(!(!n.some(e=>u.has(e.id))||p)){p=!0;for(const e of m)t.languages.registerDocumentFormattingEditProvider(e,{provideDocumentFormattingEdits(c){const o=c.getValue(),s=h(o,e);return s===o?[]:[{range:c.getFullModelRange(),text:s}]}})}}function h(t,n){try{return n==="json"?g(t):n==="css"||n==="scss"||n==="less"?w(t):n==="html"?v(t):d.has(n)?S(t):n==="markdown"?E(t):t}catch{return t}}const d=new Set(["javascript","typescript","javascriptreact","typescriptreact"]);function g(t){try{return JSON.stringify(JSON.parse(t),null,2)+`
`}catch{return t}}function S(t){const n=t.split(`
`),r=[];let e=0;const c="  ";for(let o of n){const s=o.trim();if(!s){r.push("");continue}/^[}\])]/.test(s)&&(e=Math.max(0,e-1));const i=s.replace(/"/g,(a,l,f)=>j(f,l)?a:"'").replace(/([^{};,\(\)\[\]//])\s*$/,(a,l)=>/^(if|else|for|while|function|class|import|export|\/\/)/.test(s)?a:l+";");r.push(c.repeat(e)+i),/[{(\[]$/.test(s.replace(/\/\/.*$/,""))&&e++}return r.join(`
`).replace(/\n{3,}/g,`

`)+`
`}function w(t){return t.replace(/\{/g,` {
  `).replace(/;(?!\s*\n)/g,`;
  `).replace(/\}/g,`
}
`).replace(/\n{3,}/g,`

`).trim()+`
`}function v(t){const n=t.split(`
`),r=[];let e=0;const c="  ",o=new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);for(const s of n){const i=s.trim();if(!i){r.push("");continue}const a=/^<\/([a-z][a-z0-9]*)/i.exec(i);a&&(e=Math.max(0,e-1)),r.push(c.repeat(e)+i);const l=/^<([a-z][a-z0-9]*)/i.exec(i);l&&!o.has(l[1].toLowerCase())&&!i.endsWith("/>")&&!a&&e++}return r.join(`
`).replace(/\n{3,}/g,`

`)+`
`}function E(t){return t.replace(/\n(#{1,6} )/g,`

$1`).replace(/(#{1,6} .+)\n(?!\n)/g,`$1

`).replace(/```/g,"\n```").replace(/\n{4,}/g,`


`).trim()+`
`}function j(t,n){let r=!1;for(let e=0;e<n;e++)t[e]==="`"&&(r=!r);return r}export{y as activateFormatter};
