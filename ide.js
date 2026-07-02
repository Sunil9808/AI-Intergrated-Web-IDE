// AI Web IDE - Complete VS Code Clone
'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const S = {
  tabs: [], activeTab: null, fileTree: [], expanded: new Set(),
  selectedId: null, panel: 'explorer', sidebarOpen: true,
  sidebarW: 240, bottomH: 220, bottomOpen: true, bottomTab: 'terminal',
  aiMsgs: [], aiStreaming: false, fontSize: 14, monacoEditor: null,
  monaco: null, termHistory: [], termHistIdx: -1, curLine: 1, curCol: 1,
  lang: 'plaintext', workspaceName: 'my-workspace',
  openaiKey: localStorage.getItem('oai_key') || '',
  searchQ: '', searchResults: [], replaceQ: '',
  extSearch: '', problems: [], gitBranch: 'main',
  cmdOpen: false, _menus: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const q = id => document.getElementById(id);
const qa = sel => document.querySelectorAll(sel);

const EXT_LANG = {
  js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',
  py:'python',rb:'ruby',java:'java',cpp:'cpp',cc:'cpp',cxx:'cpp',
  c:'c',cs:'csharp',go:'go',rs:'rust',php:'php',swift:'swift',
  kt:'kotlin',kts:'kotlin',html:'html',htm:'html',css:'css',
  scss:'scss',sass:'scss',less:'less',json:'json',jsonc:'json',
  yaml:'yaml',yml:'yaml',xml:'xml',md:'markdown',mdx:'markdown',
  sh:'shell',bash:'shell',zsh:'shell',fish:'shell',
  sql:'sql',r:'r',lua:'lua',pl:'perl',ex:'elixir',exs:'elixir',
  dart:'dart',hs:'haskell',toml:'ini',ini:'ini',cfg:'ini',
  env:'plaintext',txt:'plaintext',log:'plaintext',
  vue:'html',svelte:'html',astro:'html',
  dockerfile:'dockerfile',makefile:'makefile',
  graphql:'graphql',gql:'graphql',proto:'protobuf',
  tf:'hcl',tfvars:'hcl',bicep:'bicep',
  ps1:'powershell',psm1:'powershell',
};

const FILE_ICONS = {
  js:'🟨',jsx:'🟨',ts:'🔷',tsx:'🔷',py:'🐍',rb:'💎',java:'☕',
  cpp:'⚙️',c:'⚙️',cs:'🟣',go:'🔵',rs:'🦀',php:'🐘',swift:'🟠',
  kt:'🟣',html:'🌐',htm:'🌐',css:'🎨',scss:'🎨',less:'🎨',
  json:'📋',yaml:'📄',yml:'📄',xml:'📄',md:'📝',mdx:'📝',
  sh:'📟',bash:'📟',sql:'🗄️',vue:'💚',svelte:'🔶',
  dockerfile:'🐳',makefile:'⚙️',graphql:'🔮',
  png:'🖼️',jpg:'🖼️',jpeg:'🖼️',gif:'🖼️',svg:'🖼️',ico:'🖼️',
  pdf:'📑',zip:'📦',tar:'📦',gz:'📦',
  txt:'📄',env:'🔐',lock:'🔒',toml:'⚙️',ini:'⚙️',
  r:'📊',dart:'🎯',lua:'🌙',hs:'λ',
};

const LANG_NAMES = {
  typescript:'TypeScript',javascript:'JavaScript',python:'Python',
  html:'HTML',css:'CSS',scss:'SCSS',json:'JSON',markdown:'Markdown',
  shell:'Shell Script',rust:'Rust',go:'Go',java:'Java',
  cpp:'C++',c:'C',csharp:'C#',ruby:'Ruby',php:'PHP',
  plaintext:'Plain Text',sql:'SQL',yaml:'YAML',xml:'XML',
  kotlin:'Kotlin',swift:'Swift',r:'R',lua:'Lua',dart:'Dart',
  graphql:'GraphQL',dockerfile:'Dockerfile',powershell:'PowerShell',
};

function fileIcon(name, isDir=false, open=false) {
  if (isDir) return open ? '📂' : '📁';
  const ext = name.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || '📄';
}
function fileLang(name) {
  const ext = name.split('.').pop().toLowerCase();
  return EXT_LANG[ext] || 'plaintext';
}

// ── CSS ────────────────────────────────────────────────────────────────────
function injectCSS() {
  document.head.insertAdjacentHTML('beforeend', `<style>
:root{--bg:#1e1e1e;--sb:#252526;--ab:#333333;--tb:#3c3c3c;--st:#007acc;
--tab:#2d2d2d;--tba:#1e1e1e;--bdr:#454545;--tx:#cccccc;--mt:#858585;
--ac:#007acc;--hv:#2a2d2e;--sel:#094771;--inp:#3c3c3c;--pn:#1e1e1e;
--btn:#0e639c;--bth:#1177bb;--scr:#424242;--men:#252526;}
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#app{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;}
#app{display:flex;flex-direction:column;background:var(--bg);color:var(--tx);}
button{background:none;border:none;cursor:pointer;color:inherit;font:inherit;}
input,textarea{font:inherit;color:var(--tx);}
::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--scr);border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:#555;}
::selection{background:var(--sel);color:#fff;}

/* Title Bar */
#titlebar{display:flex;align-items:center;height:30px;background:var(--tb);
flex-shrink:0;user-select:none;border-bottom:1px solid #2d2d2d;}
.wbtns{display:flex;gap:6px;padding:0 12px;}
.wbtn{width:12px;height:12px;border-radius:50%;cursor:pointer;border:none;}
.wbtn.cl{background:#ff5f56;}.wbtn.mn{background:#ffbd2e;}.wbtn.mx{background:#27c93f;}
#cmd-center{flex:1;display:flex;justify-content:center;}
#cmd-pill{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);
border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:3px 12px;
min-width:300px;cursor:pointer;color:var(--mt);font-size:12px;transition:all .15s;}
#cmd-pill:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);}
#cmd-pill .ct{color:var(--tx);margin:0 4px;}
.tbr{padding-right:4px;display:flex;}
.tbtn{width:44px;height:30px;display:flex;align-items:center;justify-content:center;
font-size:14px;transition:background .1s;}
.tbtn:hover{background:rgba(255,255,255,.1);}

/* Menu Bar */
#menubar{display:flex;align-items:center;height:25px;background:var(--tb);
flex-shrink:0;border-bottom:1px solid #2d2d2d;padding-left:4px;user-select:none;}
.mi{position:relative;display:inline-block;}
.mi>button{padding:2px 8px;font-size:12px;border-radius:2px;color:var(--tx);transition:background .1s;}
.mi>button:hover,.mi.op>button{background:var(--sel);}
.mdd{display:none;position:absolute;top:100%;left:0;background:#252526;
border:1px solid var(--bdr);min-width:200px;z-index:2000;padding:4px 0;
box-shadow:0 4px 20px rgba(0,0,0,.7);}
.mi.op .mdd{display:block;}
.mr{display:flex;align-items:center;justify-content:space-between;
padding:4px 16px;font-size:12px;color:var(--tx);cursor:pointer;white-space:nowrap;gap:16px;}
.mr:hover{background:var(--sel);color:#fff;}
.mr.dis{color:var(--mt);cursor:default;}.mr.dis:hover{background:transparent;color:var(--mt);}
.ms{height:1px;background:var(--bdr);margin:3px 0;}
.msc{color:var(--mt);font-size:11px;}.mr:hover .msc{color:rgba(255,255,255,.6);}

/* Main Layout */
#main{display:flex;flex:1;overflow:hidden;}

/* Activity Bar */
#actbar{width:48px;background:var(--ab);display:flex;flex-direction:column;
flex-shrink:0;border-right:1px solid var(--bdr);user-select:none;}
.ai-item{width:48px;height:48px;display:flex;align-items:center;justify-content:center;
cursor:pointer;position:relative;transition:color .1s;color:rgba(255,255,255,.5);}
.ai-item:hover{color:rgba(255,255,255,.9);}
.ai-item.act{color:#fff;border-left:2px solid #fff;}
.ai-item svg{width:24px;height:24px;}
.ai-tip{display:none;position:absolute;left:52px;top:50%;transform:translateY(-50%);
background:#252526;border:1px solid var(--bdr);padding:4px 8px;font-size:12px;
white-space:nowrap;z-index:200;pointer-events:none;border-radius:3px;color:var(--tx);}
.ai-item:hover .ai-tip{display:block;}
.ai-sp{flex:1;}
.ai-badge{position:absolute;top:8px;right:7px;background:#7c3aed;color:#fff;
font-size:9px;border-radius:7px;padding:0 4px;min-width:14px;text-align:center;}

/* Sidebar */
#sidebar{background:var(--sb);display:flex;flex-direction:column;
overflow:hidden;border-right:1px solid var(--bdr);flex-shrink:0;}
#sbresize{width:4px;cursor:col-resize;background:transparent;flex-shrink:0;z-index:10;transition:background .1s;}
#sbresize:hover,#sbresize.drag{background:var(--ac);}
.ph{display:flex;align-items:center;justify-content:space-between;
padding:8px 12px 6px;user-select:none;flex-shrink:0;
text-transform:uppercase;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--mt);}
.ph .pa{display:flex;gap:2px;}
.ib{width:22px;height:22px;display:flex;align-items:center;justify-content:center;
border-radius:3px;transition:background .1s;color:var(--mt);font-size:14px;}
.ib:hover{background:rgba(255,255,255,.1);color:var(--tx);}

/* File Tree */
#filetree{overflow-y:auto;flex:1;padding-bottom:8px;}
.tn{display:flex;align-items:center;height:22px;cursor:pointer;user-select:none;
transition:background .05s;position:relative;}
.tn:hover{background:rgba(255,255,255,.06);}
.tn.sel{background:var(--sel)!important;color:#fff;}
.tn .arr{width:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
font-size:10px;color:var(--mt);}
.tn .fi{margin-right:4px;font-size:14px;flex-shrink:0;}
.tn .fn{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}
.tn .fd{color:var(--mt);font-size:11px;padding-right:4px;flex-shrink:0;}

/* Editor Area */
#editor-area{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}

/* Tabs */
#tabsbar{display:flex;align-items:flex-end;background:var(--tab);
border-bottom:1px solid var(--bdr);flex-shrink:0;min-height:35px;
overflow-x:auto;overflow-y:hidden;}
#tabsbar::-webkit-scrollbar{height:3px;}
.tab{display:flex;align-items:center;gap:5px;padding:0 10px;height:35px;
cursor:pointer;border-right:1px solid var(--bdr);min-width:90px;max-width:190px;
position:relative;flex-shrink:0;color:var(--mt);font-size:13px;
border-top:1px solid transparent;transition:background .1s;}
.tab:hover{background:rgba(255,255,255,.05);color:var(--tx);}
.tab.act{background:var(--tba);color:var(--tx);border-top:1px solid var(--ac);}
.tab .ti{font-size:14px;flex-shrink:0;}
.tab .tn2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.tab .tc{width:16px;height:16px;border-radius:3px;display:flex;align-items:center;
justify-content:center;opacity:0;transition:opacity .1s;flex-shrink:0;font-size:12px;}
.tab:hover .tc,.tab.act .tc{opacity:.7;}
.tab .tc:hover{opacity:1!important;background:rgba(255,255,255,.15);}
.tab .dd{width:8px;height:8px;border-radius:50%;background:var(--tx);flex-shrink:0;}

/* Breadcrumb */
#bc{display:flex;align-items:center;height:22px;padding:0 12px;background:var(--tba);
border-bottom:1px solid var(--bdr);font-size:12px;color:var(--mt);
flex-shrink:0;overflow:hidden;white-space:nowrap;}
#bc .bs{cursor:pointer;transition:color .1s;}.bc-cur{color:var(--tx)!important;}
#bc .bsep{margin:0 4px;opacity:.4;}

/* Monaco */
#monacoWrap{flex:1;overflow:hidden;position:relative;}
#monacoMount{width:100%;height:100%;}
#placeholder{display:flex;flex-direction:column;align-items:center;
justify-content:center;height:100%;gap:18px;color:var(--mt);user-select:none;}
#placeholder .pl{font-size:60px;opacity:.12;}
#placeholder h2{font-size:20px;font-weight:400;color:var(--tx);opacity:.55;}
#placeholder .shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;font-size:12px;}
#placeholder .sr{display:flex;align-items:center;gap:8px;}
#placeholder kbd{background:var(--inp);border:1px solid var(--bdr);border-radius:3px;
padding:1px 6px;font-size:11px;font-family:monospace;}

/* Bottom Panel */
#bresize{height:4px;cursor:row-resize;background:transparent;flex-shrink:0;transition:background .1s;}
#bresize:hover,#bresize.drag{background:var(--ac);}
#bottompanel{background:var(--pn);display:flex;flex-direction:column;
overflow:hidden;border-top:1px solid var(--bdr);flex-shrink:0;}
#paneltabs{display:flex;align-items:center;background:#252526;
border-bottom:1px solid var(--bdr);flex-shrink:0;height:35px;user-select:none;}
.ptab{padding:0 16px;height:100%;display:flex;align-items:center;font-size:12px;
cursor:pointer;color:var(--mt);border-bottom:1px solid transparent;transition:all .1s;}
.ptab:hover{color:var(--tx);}
.ptab.act{color:var(--tx);border-bottom:1px solid var(--ac);}
#panelactions{margin-left:auto;display:flex;align-items:center;gap:2px;padding-right:6px;}

/* Terminal */
#termout{flex:1;overflow-y:auto;padding:6px 12px 2px;
font-family:'Cascadia Code','JetBrains Mono','Fira Code',Consolas,monospace;
font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-all;}
#terminputrow{display:flex;align-items:center;padding:3px 12px 5px;gap:4px;
border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;}
#tprompt{color:#4ec9b0;font-family:monospace;font-size:13px;flex-shrink:0;}
#termin{flex:1;background:transparent;border:none;outline:none;caret-color:#aeafad;
font-family:'Cascadia Code',Consolas,monospace;font-size:13px;color:#cccccc;}
.tc2{color:#cccccc;}.ter{color:#f44747;}.tcmd{color:#4ec9b0;}
.tinf{color:#569cd6;}.tsuc{color:#4ec9b0;}.twrn{color:#dcdcaa;}.tmt{color:#858585;}

/* AI Chat */
#aichat{display:flex;flex-direction:column;height:100%;overflow:hidden;}
#aimsgs{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;}
.amsg{display:flex;gap:8px;}
.amsg .av{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;
align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.amsg.user .av{background:var(--ac);color:#fff;}
.amsg.ai .av{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;}
.amsg .ab{flex:1;min-width:0;}
.amsg .rl{font-size:11px;color:var(--mt);margin-bottom:2px;}
.amsg .ac2{font-size:12.5px;line-height:1.6;color:var(--tx);word-break:break-word;}
.amsg .ac2 pre{background:#0d0d0d;border:1px solid var(--bdr);border-radius:4px;
padding:10px;overflow-x:auto;margin:5px 0;font-size:12px;
font-family:'Cascadia Code',Consolas,monospace;}
.amsg .ac2 code{background:rgba(255,255,255,.1);padding:1px 4px;border-radius:3px;font-size:12px;font-family:monospace;}
.amsg .ac2 pre code{background:none;padding:0;}
#aiinput{border-top:1px solid var(--bdr);padding:8px;flex-shrink:0;}
#aiqbtns{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}
.aqb{padding:3px 8px;border-radius:3px;font-size:11px;cursor:pointer;
background:var(--inp);border:1px solid var(--bdr);color:var(--mt);transition:all .15s;}
.aqb:hover{border-color:var(--ac);color:var(--ac);}
#airow{display:flex;gap:6px;align-items:flex-end;}
#aita{flex:1;background:var(--inp);border:1px solid var(--bdr);border-radius:4px;
padding:6px 8px;color:var(--tx);font-size:12px;resize:none;outline:none;
min-height:36px;max-height:100px;line-height:1.4;}
#aita:focus{border-color:var(--ac);}
#aisend{width:32px;height:32px;border-radius:4px;display:flex;align-items:center;
justify-content:center;cursor:pointer;flex-shrink:0;
background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;transition:opacity .1s;}
#aisend:hover{opacity:.85;}
.cblink{display:inline-block;width:2px;height:13px;background:#7c3aed;
margin-left:2px;animation:blink 1s step-end infinite;vertical-align:text-bottom;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

/* Search Panel */
#searchpanel{padding:8px;display:flex;flex-direction:column;gap:6px;flex:1;overflow:hidden;}
.siw{display:flex;align-items:center;gap:6px;background:var(--inp);
border:1px solid var(--bdr);border-radius:3px;padding:4px 8px;}
.siw:focus-within{border-color:var(--ac);}
.siw input{flex:1;background:transparent;border:none;outline:none;color:var(--tx);font-size:13px;}
#searchres{overflow-y:auto;flex:1;}
.srf{padding:3px 8px;font-size:12px;font-weight:600;color:var(--tx);}
.srm{padding:2px 8px 2px 20px;font-size:12px;cursor:pointer;
font-family:monospace;color:var(--mt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.srm:hover{background:rgba(255,255,255,.06);color:var(--tx);}
.srm mark{background:rgba(255,200,0,.3);color:var(--tx);border-radius:2px;}

/* Git Panel */
#gitpanel{padding:8px;display:flex;flex-direction:column;flex:1;overflow:hidden;gap:8px;}
#gcin{background:var(--inp);border:1px solid var(--bdr);border-radius:3px;
color:var(--tx);padding:6px 8px;font-size:12px;resize:none;outline:none;width:100%;min-height:52px;}
#gcin:focus{border-color:var(--ac);}
.gbtn{padding:5px 10px;background:var(--btn);color:#fff;border-radius:3px;
font-size:12px;cursor:pointer;text-align:center;transition:background .1s;}
.gbtn:hover{background:var(--bth);}

/* Extensions */
#extpanel{display:flex;flex-direction:column;flex:1;overflow:hidden;}
#extsw{padding:8px;}
#extsin{width:100%;background:var(--inp);border:1px solid var(--bdr);
border-radius:3px;color:var(--tx);padding:5px 8px;font-size:13px;outline:none;}
#extsin:focus{border-color:var(--ac);}
#extlist{overflow-y:auto;flex:1;}
.ecard{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
cursor:pointer;transition:background .1s;border-bottom:1px solid rgba(255,255,255,.04);}
.ecard:hover{background:rgba(255,255,255,.04);}
.eic{font-size:28px;flex-shrink:0;}
.ein{flex:1;min-width:0;}
.enm{font-size:13px;font-weight:600;color:var(--tx);}
.epb{font-size:11px;color:var(--mt);}
.eds{font-size:12px;color:var(--mt);margin-top:2px;}
.eib{padding:3px 8px;border:1px solid var(--bdr);border-radius:3px;
font-size:11px;color:var(--tx);cursor:pointer;flex-shrink:0;transition:all .1s;}
.eib:hover{background:var(--btn);border-color:var(--btn);color:#fff;}
.eib.ins{color:var(--mt);cursor:default;}
.esec{padding:3px 12px;font-size:11px;font-weight:700;color:var(--mt);
text-transform:uppercase;letter-spacing:.05em;}

/* Context Menu */
#ctxmenu{position:fixed;z-index:9999;background:#252526;border:1px solid var(--bdr);
border-radius:3px;min-width:175px;padding:4px 0;
box-shadow:0 4px 24px rgba(0,0,0,.7);display:none;}
#ctxmenu.sh{display:block;}
.cmi{display:flex;align-items:center;justify-content:space-between;
padding:5px 16px;font-size:12px;cursor:pointer;color:var(--tx);gap:12px;}
.cmi:hover{background:var(--sel);color:#fff;}
.cmi.dis{color:var(--mt);cursor:default;}.cmi.dis:hover{background:transparent;color:var(--mt);}
.cmsc{color:var(--mt);font-size:11px;}.cmi:hover .cmsc{color:rgba(255,255,255,.6);}
.cms{height:1px;background:var(--bdr);margin:3px 0;}

/* Command Palette */
#cmdpal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);
z-index:9998;display:none;align-items:flex-start;justify-content:center;padding-top:80px;}
#cmdpal.sh{display:flex;}
#cmdbox{background:#252526;border:1px solid var(--bdr);border-radius:6px;
width:560px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.85);overflow:hidden;}
#cmdinw{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--bdr);}
#cmdin{flex:1;background:transparent;border:none;outline:none;color:var(--tx);font-size:14px;}
#cmdres{max-height:320px;overflow-y:auto;}
.cr{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;font-size:13px;color:var(--tx);}
.cr:hover,.cr.crs{background:var(--sel);color:#fff;}
.cric{font-size:16px;width:22px;text-align:center;flex-shrink:0;}
.crl{flex:1;}.crex{font-size:11px;color:var(--mt);}
.cr:hover .crex,.cr.crs .crex{color:rgba(255,255,255,.6);}
.crcat{font-size:11px;color:var(--mt);flex-shrink:0;}
.cr:hover .crcat,.cr.crs .crcat{color:rgba(255,255,255,.6);}

/* Modal */
#modover{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9990;
display:none;align-items:center;justify-content:center;}
#modover.sh{display:flex;}
#modbox{background:#252526;border:1px solid var(--bdr);border-radius:6px;
padding:20px;min-width:370px;box-shadow:0 20px 60px rgba(0,0,0,.85);}
#modbox h3{font-size:14px;font-weight:600;color:var(--tx);margin-bottom:10px;}
#modin{width:100%;background:var(--inp);border:1px solid var(--bdr);border-radius:3px;
color:var(--tx);padding:6px 10px;font-size:13px;outline:none;margin-bottom:12px;}
#modin:focus{border-color:var(--ac);}
#modbtns{display:flex;justify-content:flex-end;gap:8px;}
.mdbtn{padding:5px 14px;border-radius:3px;font-size:13px;cursor:pointer;}
.mdbtn.pr{background:var(--btn);color:#fff;border:1px solid var(--btn);}
.mdbtn.pr:hover{background:var(--bth);}
.mdbtn.ca{background:transparent;color:var(--tx);border:1px solid var(--bdr);}
.mdbtn.ca:hover{background:rgba(255,255,255,.08);}

/* Notifications */
#notifarea{position:fixed;bottom:26px;right:14px;display:flex;flex-direction:column;gap:6px;z-index:9997;}
.notif{display:flex;align-items:flex-start;gap:10px;background:#252526;border:1px solid var(--bdr);
border-radius:4px;padding:10px 14px;max-width:310px;min-width:190px;
box-shadow:0 4px 16px rgba(0,0,0,.5);animation:slin .2s ease;}
.notif.info{border-left:3px solid var(--ac);}
.notif.success{border-left:3px solid #4ec9b0;}
.notif.warning{border-left:3px solid #dcdcaa;}
.notif.error{border-left:3px solid #f44747;}
.nfi{font-size:15px;flex-shrink:0;}.nmsg{font-size:12px;line-height:1.4;color:var(--tx);flex:1;}
.nclose{color:var(--mt);font-size:15px;cursor:pointer;flex-shrink:0;}
@keyframes slin{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}

/* Status Bar */
#statusbar{display:flex;align-items:center;justify-content:space-between;
height:22px;background:var(--st);color:#fff;flex-shrink:0;padding:0 4px;
font-size:12px;user-select:none;}
.si{display:flex;align-items:center;gap:4px;padding:0 6px;height:100%;
cursor:pointer;transition:background .1s;border-radius:2px;white-space:nowrap;}
.si:hover{background:rgba(255,255,255,.2);}
#sbl,#sbr{display:flex;align-items:center;}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;
flex:1;gap:10px;color:var(--mt);font-size:13px;text-align:center;padding:16px;}
</style>`);
}

// ── SVG Icons ──────────────────────────────────────────────────────────────
const I = {
  explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>`,
  search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>`,
  git:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="6" cy="18" r="2"/><path d="M6 8v8M18 8c0-4-6-5-6-2v8c0 3 6 4 6 2"/></svg>`,
  debug:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
  ext:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>`,
  ai:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  send:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  plus:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
  trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`,
  refresh:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4v5h5"/><path d="M20 20v-5h-5"/><path d="M4 9a9 9 0 0 1 15-2.3M20 15a9 9 0 0 1-15 2.3"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9l8 8 8-8"/></svg>`,
  fplus:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v6M9 14h6"/></svg>`,
  nfile:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 11v6M9 14h6"/></svg>`,
  play:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  gitsym:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 9v6m12-3c0 4-6 6-6 6V9"/></svg>`,
  ofolder:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
  close:    `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l10 10M11 1L1 11"/></svg>`,
};


// ── HTML Layout ────────────────────────────────────────────────────────────
function buildHTML() {
  document.getElementById('app').innerHTML = `
<div id="titlebar">
  <div class="wbtns"><button class="wbtn cl"></button><button class="wbtn mn"></button><button class="wbtn mx"></button></div>
  <div id="cmd-center"><div id="cmd-pill" onclick="openCmd()">
    <span>🔍</span><span class="ct" id="wstitle">AI Web IDE</span>
    <span style="margin-left:auto;font-size:11px;opacity:.5">Ctrl+Shift+P</span>
  </div></div>
  <div class="tbr">
    <button class="tbtn" onclick="toggleSB()" title="Toggle Sidebar (Ctrl+B)">⊟</button>
    <button class="tbtn" onclick="toggleBP()" title="Toggle Panel (Ctrl+\`)">⊡</button>
  </div>
</div>
<div id="menubar"></div>
<div id="main">
  <div id="actbar">
    <div class="ai-item act" data-p="explorer" onclick="switchP('explorer')" title="Explorer">${I.explorer}<div class="ai-tip">Explorer (Ctrl+Shift+E)</div></div>
    <div class="ai-item" data-p="search" onclick="switchP('search')" title="Search">${I.search}<div class="ai-tip">Search (Ctrl+Shift+F)</div></div>
    <div class="ai-item" data-p="git" onclick="switchP('git')" title="Source Control">${I.git}<div class="ai-tip">Source Control (Ctrl+Shift+G)</div></div>
    <div class="ai-item" data-p="debug" onclick="switchP('debug')" title="Run & Debug">${I.debug}<div class="ai-tip">Run and Debug (Ctrl+Shift+D)</div></div>
    <div class="ai-item" data-p="extensions" onclick="switchP('extensions')" title="Extensions">${I.ext}<div class="ai-tip">Extensions (Ctrl+Shift+X)</div></div>
    <div class="ai-item" data-p="ai" onclick="switchP('ai')" title="AI Assistant">${I.ai}<div class="ai-badge">AI</div><div class="ai-tip">AI Assistant (Ctrl+Shift+A)</div></div>
    <div class="ai-sp"></div>
    <div class="ai-item" onclick="showSettings()" title="Settings">${I.settings}<div class="ai-tip">Settings (Ctrl+,)</div></div>
  </div>
  <div id="sidebar" style="width:240px"><div id="sbcontent" style="display:flex;flex-direction:column;height:100%;overflow:hidden;"></div></div>
  <div id="sbresize"></div>
  <div id="editor-area">
    <div id="tabsbar"></div>
    <div id="bc"></div>
    <div id="monacoWrap">
      <div id="monacoMount" style="display:none"></div>
      <div id="placeholder">
        <div class="pl">⚡</div>
        <h2>AI Web IDE</h2>
        <p style="font-size:12px;color:var(--mt);margin-bottom:4px">Open a file or folder to start coding</p>
        <div class="shortcuts">
          <div class="sr"><kbd>Ctrl+N</kbd><span>New File</span></div>
          <div class="sr"><kbd>Ctrl+O</kbd><span>Open File</span></div>
          <div class="sr"><kbd>Ctrl+K O</kbd><span>Open Folder</span></div>
          <div class="sr"><kbd>Ctrl+Shift+P</kbd><span>Command Palette</span></div>
          <div class="sr"><kbd>Ctrl+\`</kbd><span>Terminal</span></div>
          <div class="sr"><kbd>Ctrl+Shift+A</kbd><span>AI Assistant</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="openFolder()" style="padding:7px 18px;background:var(--btn);color:#fff;border-radius:4px;font-size:12px;cursor:pointer;">Open Folder…</button>
          <button onclick="openFile()" style="padding:7px 18px;background:transparent;border:1px solid var(--bdr);color:var(--tx);border-radius:4px;font-size:12px;cursor:pointer;">Open File…</button>
        </div>
      </div>
    </div>
    <div id="bresize"></div>
    <div id="bottompanel" style="height:220px">
      <div id="paneltabs">
        <div class="ptab act" data-t="terminal" onclick="switchBP('terminal')">TERMINAL</div>
        <div class="ptab" data-t="output" onclick="switchBP('output')">OUTPUT</div>
        <div class="ptab" data-t="problems" onclick="switchBP('problems')">PROBLEMS</div>
        <div class="ptab" data-t="ports" onclick="switchBP('ports')">PORTS</div>
        <div id="panelactions">
          <button class="ib" onclick="newTerm()" title="New Terminal">${I.plus}</button>
          <button class="ib" onclick="clearTerm()" title="Clear Terminal">${I.trash}</button>
          <button class="ib" onclick="toggleBP()" title="Close Panel" style="font-size:16px">✕</button>
        </div>
      </div>
      <div id="panelcontent" style="flex:1;display:flex;overflow:hidden;"></div>
    </div>
  </div>
</div>
<div id="statusbar">
  <div id="sbl">
    <div class="si" onclick="switchP('git')"><span>⎇</span><span id="sbbranch">main</span></div>
    <div class="si" id="sbprobs"><span>✕</span><span id="sberr">0</span><span style="margin-left:3px">⚠</span><span id="sbwrn">0</span></div>
  </div>
  <div id="sbr">
    <div class="si" id="sbsrv"><span>⚡</span><span id="sbsrvtxt">Ready</span></div>
    <div class="si" id="sbcur">Ln 1, Col 1</div>
    <div class="si" id="sblang" onclick="openCmd()">Plain Text</div>
    <div class="si">UTF-8</div>
    <div class="si">Spaces: 2</div>
    <div class="si" onclick="openCmd()">🔍</div>
  </div>
</div>
<div id="ctxmenu"></div>
<div id="cmdpal" onclick="closeCmd()"><div id="cmdbox" onclick="event.stopPropagation()">
  <div id="cmdinw"><span style="font-size:16px">🔍</span><input id="cmdin" placeholder="Type a command or file name…" oninput="filterCmd(this.value)" onkeydown="cmdKey(event)"/></div>
  <div id="cmdres"></div>
</div></div>
<div id="modover"><div id="modbox">
  <h3 id="modlbl"></h3>
  <input id="modin" onkeydown="if(event.key==='Enter')modOK();else if(event.key==='Escape')modClose()"/>
  <div id="modbtns"><button class="mdbtn ca" onclick="modClose()">Cancel</button><button class="mdbtn pr" onclick="modOK()">OK</button></div>
</div></div>
<div id="notifarea"></div>
<input type="file" id="filein" multiple style="display:none" onchange="onFileIn(event)"/>
<input type="file" id="folderin" webkitdirectory multiple style="display:none" onchange="onFolderIn(event)"/>
`;
}


// ── Menu Bar ───────────────────────────────────────────────────────────────
function buildMenus() {
  const menus = [
    {lbl:'File', items:[
      {lbl:'New File', sc:'Ctrl+N', fn:newFile},
      {lbl:'New Window', sc:'Ctrl+Shift+N'},
      {sep:1},
      {lbl:'Open File…', sc:'Ctrl+O', fn:openFile},
      {lbl:'Open Folder…', sc:'Ctrl+K O', fn:openFolder},
      {sep:1},
      {lbl:'Save', sc:'Ctrl+S', fn:saveActive},
      {lbl:'Save As…', sc:'Ctrl+Shift+S', fn:saveAs},
      {lbl:'Save All', sc:'Ctrl+K S', fn:saveAll},
      {sep:1},
      {lbl:'Close Editor', sc:'Ctrl+W', fn:closeActiveTab},
      {lbl:'Close All', sc:'Ctrl+K W', fn:closeAllTabs},
    ]},
    {lbl:'Edit', items:[
      {lbl:'Undo', sc:'Ctrl+Z', fn:()=>mcmd('undo')},
      {lbl:'Redo', sc:'Ctrl+Y', fn:()=>mcmd('redo')},
      {sep:1},
      {lbl:'Cut', sc:'Ctrl+X', fn:()=>mcmd('editor.action.clipboardCutAction')},
      {lbl:'Copy', sc:'Ctrl+C', fn:()=>mcmd('editor.action.clipboardCopyAction')},
      {lbl:'Paste', sc:'Ctrl+V', fn:()=>mcmd('editor.action.clipboardPasteAction')},
      {sep:1},
      {lbl:'Find', sc:'Ctrl+F', fn:()=>mcmd('actions.find')},
      {lbl:'Replace', sc:'Ctrl+H', fn:()=>mcmd('editor.action.startFindReplaceAction')},
      {lbl:'Find in Files', sc:'Ctrl+Shift+F', fn:()=>switchP('search')},
      {sep:1},
      {lbl:'Format Document', sc:'Shift+Alt+F', fn:()=>mcmd('editor.action.formatDocument')},
      {lbl:'Toggle Comment', sc:'Ctrl+/', fn:()=>mcmd('editor.action.commentLine')},
      {lbl:'Toggle Line Comment', sc:'Ctrl+K C', fn:()=>mcmd('editor.action.addCommentLine')},
    ]},
    {lbl:'View', items:[
      {lbl:'Command Palette…', sc:'Ctrl+Shift+P', fn:openCmd},
      {sep:1},
      {lbl:'Explorer', sc:'Ctrl+Shift+E', fn:()=>switchP('explorer')},
      {lbl:'Search', sc:'Ctrl+Shift+F', fn:()=>switchP('search')},
      {lbl:'Source Control', sc:'Ctrl+Shift+G', fn:()=>switchP('git')},
      {lbl:'Run and Debug', sc:'Ctrl+Shift+D', fn:()=>switchP('debug')},
      {lbl:'Extensions', sc:'Ctrl+Shift+X', fn:()=>switchP('extensions')},
      {lbl:'AI Assistant', sc:'Ctrl+Shift+A', fn:()=>switchP('ai')},
      {sep:1},
      {lbl:'Toggle Sidebar', sc:'Ctrl+B', fn:toggleSB},
      {lbl:'Toggle Terminal', sc:'Ctrl+`', fn:toggleBP},
      {sep:1},
      {lbl:'Toggle Word Wrap', sc:'Alt+Z', fn:toggleWW},
      {lbl:'Toggle Minimap', fn:toggleMM},
      {sep:1},
      {lbl:'Zoom In', sc:'Ctrl+=', fn:()=>changeFS(1)},
      {lbl:'Zoom Out', sc:'Ctrl+-', fn:()=>changeFS(-1)},
      {lbl:'Reset Zoom', sc:'Ctrl+0', fn:()=>changeFS(0)},
    ]},
    {lbl:'Go', items:[
      {lbl:'Go to File…', sc:'Ctrl+P', fn:openCmd},
      {lbl:'Go to Line…', sc:'Ctrl+G', fn:()=>mcmd('editor.action.gotoLine')},
      {lbl:'Go to Definition', sc:'F12', fn:()=>mcmd('editor.action.revealDefinition')},
      {lbl:'Go to References', sc:'Shift+F12', fn:()=>mcmd('editor.action.goToReferences')},
      {sep:1},
      {lbl:'Go Back', sc:'Alt+←'},
      {lbl:'Go Forward', sc:'Alt+→'},
    ]},
    {lbl:'Run', items:[
      {lbl:'Run Active File', sc:'F5', fn:runFile},
      {lbl:'Start Debugging', sc:'F5', fn:runFile},
      {lbl:'Stop', sc:'Shift+F5'},
      {sep:1},
      {lbl:'New Terminal', sc:'Ctrl+Shift+`', fn:newTerm},
    ]},
    {lbl:'Terminal', items:[
      {lbl:'New Terminal', sc:'Ctrl+Shift+`', fn:newTerm},
      {lbl:'Split Terminal'},
      {sep:1},
      {lbl:'Run Active File', fn:runFile},
      {lbl:'Run Build Task', sc:'Ctrl+Shift+B'},
      {sep:1},
      {lbl:'Clear Terminal', fn:clearTerm},
    ]},
    {lbl:'Help', items:[
      {lbl:'Welcome'},
      {lbl:'Documentation', fn:()=>window.open('https://code.visualstudio.com/docs','_blank')},
      {sep:1},
      {lbl:'Keyboard Shortcuts', sc:'Ctrl+K S'},
      {sep:1},
      {lbl:'About AI Web IDE', fn:()=>notify('AI Web IDE v1.0.0 — VS Code–style IDE with real AI','info')},
    ]},
  ];
  S._menus = menus;
  const bar = q('menubar');
  bar.innerHTML = '';
  menus.forEach((m,mi) => {
    const div = document.createElement('div');
    div.className = 'mi';
    div.innerHTML = `<button>${m.lbl}</button><div class="mdd">${
      m.items.map((it,ii) => it.sep
        ? '<div class="ms"></div>'
        : `<div class="mr${it.fn?'':' dis'}" data-mi="${mi}" data-ii="${ii}">${esc(it.lbl)}<span class="msc">${it.sc||''}</span></div>`
      ).join('')
    }</div>`;
    div.querySelector('button').addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = div.classList.contains('op');
      closeMenus();
      if (!isOpen) div.classList.add('op');
    });
    div.addEventListener('mouseover', () => {
      if (document.querySelector('.mi.op')) { closeMenus(); div.classList.add('op'); }
    });
    div.querySelectorAll('.mr:not(.dis)').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        closeMenus();
        const fn = menus[+el.dataset.mi]?.items[+el.dataset.ii]?.fn;
        if (fn) fn();
      });
    });
    bar.appendChild(div);
  });
}
function closeMenus() { qa('.mi.op').forEach(m => m.classList.remove('op')); }


// ── Layout helpers ─────────────────────────────────────────────────────────
function toggleSB() {
  S.sidebarOpen = !S.sidebarOpen;
  q('sidebar').style.display = S.sidebarOpen ? 'flex' : 'none';
  q('sbresize').style.display = S.sidebarOpen ? 'block' : 'none';
}
function toggleBP() {
  S.bottomOpen = !S.bottomOpen;
  q('bottompanel').style.display = S.bottomOpen ? 'flex' : 'none';
  q('bresize').style.display = S.bottomOpen ? 'block' : 'none';
}

// ── Activity Bar / Panel Switch ────────────────────────────────────────────
function switchP(name) {
  if (S.panel === name && S.sidebarOpen) { toggleSB(); return; }
  S.panel = name;
  if (!S.sidebarOpen) { S.sidebarOpen = true; q('sidebar').style.display = 'flex'; q('sbresize').style.display = 'block'; }
  qa('.ai-item').forEach(el => el.classList.toggle('act', el.dataset.p === name));
  renderSB();
}

function renderSB() {
  const c = q('sbcontent');
  const panels = { explorer: explorerHTML, search: searchHTML, git: gitHTML, debug: debugHTML, extensions: extHTML, ai: aiHTML };
  c.innerHTML = (panels[S.panel] || (() => ''))();
  bindSBEvents();
}

function bindSBEvents() {
  if (S.panel === 'extensions') {
    q('extsin')?.addEventListener('input', e => { S.extSearch = e.target.value; renderSB(); });
  }
  if (S.panel === 'search') {
    q('searchin')?.addEventListener('input', e => doSearch(e.target.value));
    q('replacein')?.addEventListener('input', e => { S.replaceQ = e.target.value; });
  }
  if (S.panel === 'ai') {
    q('aimsgs')?.scrollTo(0, 999999);
    q('aita')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); } });
  }
}

// ── Explorer ───────────────────────────────────────────────────────────────
function explorerHTML() {
  const wname = S.workspaceName.toUpperCase();
  const treeHTML = S.fileTree.length
    ? `<div class="tn" style="padding-left:8px;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--mt);cursor:default;text-transform:uppercase;height:22px;">
        <span style="font-size:10px;margin-right:4px;color:var(--mt)">▾</span><span>${wname}</span></div>
       ${renderTree(S.fileTree, 1)}`
    : `<div style="padding:12px;color:var(--mt);font-size:12px;line-height:1.7">
        <p>No folder opened.</p>
        <p style="margin-top:6px"><button onclick="openFolder()" style="color:var(--ac);background:none;border:none;cursor:pointer;font-size:12px;text-decoration:underline">Open a folder</button> to start.</p>
        <p><button onclick="openFile()" style="color:var(--ac);background:none;border:none;cursor:pointer;font-size:12px;text-decoration:underline">Open files</button> from your device.</p>
      </div>`;
  return `<div class="ph">Explorer<div class="pa">
    <button class="ib" onclick="newFileDlg()" title="New File">${I.nfile}</button>
    <button class="ib" onclick="newFolderDlg()" title="New Folder">${I.fplus}</button>
    <button class="ib" onclick="openFolder()" title="Open Folder">${I.ofolder}</button>
    <button class="ib" onclick="collapseAll()" title="Collapse All">${I.collapse}</button>
  </div></div>
  <div id="filetree">${treeHTML}</div>`;
}

function renderTree(nodes, depth) {
  return nodes.map(n => {
    const isDir = n.type === 'directory';
    const isOpen = S.expanded.has(n.id);
    const isSel = S.selectedId === n.id;
    const icon = fileIcon(n.name, isDir, isOpen);
    const arrow = isDir ? (isOpen ? '▾' : '▸') : '';
    const pl = depth * 8;
    const childrenHTML = isDir && isOpen && n.children ? renderTree(n.children, depth + 1) : '';
    return `<div class="tn${isDir?' folder':''}${isSel?' sel':''}"
      data-id="${n.id}" data-type="${n.type}"
      onclick="tnClick(event,'${n.id}')"
      ondblclick="tnDbl(event,'${n.id}')"
      oncontextmenu="tnCtx(event,'${n.id}')"
      draggable="true"
      style="padding-left:${pl}px">
      <span class="arr">${arrow}</span>
      <span class="fi">${icon}</span>
      <span class="fn">${esc(n.name)}</span>
    </div>${childrenHTML}`;
  }).join('');
}

function tnClick(e, id) {
  e.stopPropagation();
  const n = findNode(S.fileTree, id);
  if (!n) return;
  S.selectedId = id;
  if (n.type === 'directory') {
    S.expanded.has(id) ? S.expanded.delete(id) : S.expanded.add(id);
    renderSB();
  } else {
    renderSB();
    openTabFor(n);
  }
}
function tnDbl(e, id) { e.stopPropagation(); const n = findNode(S.fileTree, id); if (n && n.type === 'file') openTabFor(n); }
function tnCtx(e, id) { e.preventDefault(); e.stopPropagation(); const n = findNode(S.fileTree, id); if (n) showTreeCtx(e.clientX, e.clientY, n); }

function showTreeCtx(x, y, n) {
  const isDir = n.type === 'directory';
  const items = [
    ...(isDir ? [{lbl:'New File', fn:()=>newFileUnder(n)}, {lbl:'New Folder', fn:()=>newFolderUnder(n)}, {sep:1}] : []),
    {lbl:'Open', fn:()=>openTabFor(n)},
    {sep:1},
    {lbl:'Rename…', fn:()=>renameNode(n)},
    {lbl:'Delete', fn:()=>deleteNode(n)},
    {sep:1},
    {lbl:'Copy Path', fn:()=>{navigator.clipboard?.writeText(n.path||n.name); notify('Path copied');}},
    ...(isDir ? [{sep:1},{lbl:'Open in Terminal', fn:()=>{switchBP('terminal'); termPrint(`<span class="tcmd">$ </span>cd ${esc(n.name)}\n`);}}] : []),
  ];
  showCtx(x, y, items);
}

// ── Node helpers ───────────────────────────────────────────────────────────
function findNode(tree, id) {
  for (const n of tree) { if (n.id === id) return n; if (n.children) { const f = findNode(n.children, id); if (f) return f; } }
  return null;
}
function removeNode(tree, id) {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) { tree.splice(i, 1); return true; }
    if (tree[i].children && removeNode(tree[i].children, id)) return true;
  }
  return false;
}
function findFileByName(nodes, name) {
  for (const n of nodes) { if (n.name === name) return n; if (n.children) { const f = findFileByName(n.children, name); if (f) return f; } }
  return null;
}
function flatFiles(nodes, acc = []) { nodes.forEach(n => { if (n.type === 'file') acc.push(n); if (n.children) flatFiles(n.children, acc); }); return acc; }
function collapseAll() { S.expanded.clear(); renderSB(); }

// ── New / Rename / Delete ──────────────────────────────────────────────────
function newFileDlg() {
  const parent = S.selectedId ? findNode(S.fileTree, S.selectedId) : null;
  const tgt = parent?.type === 'directory' ? parent : null;
  showModal('New File', 'File name:', 'untitled.ts', name => {
    if (!name) return;
    const node = {id:uid(), name, type:'file', content:defContent(name, fileLang(name)), path:tgt?(tgt.path||tgt.name)+'/'+name:name};
    if (tgt) { if (!tgt.children) tgt.children=[]; tgt.children.push(node); S.expanded.add(tgt.id); }
    else S.fileTree.push(node);
    renderSB(); openTabFor(node); notify('Created '+name,'success');
  });
}
function newFolderDlg() {
  const parent = S.selectedId ? findNode(S.fileTree, S.selectedId) : null;
  const tgt = parent?.type === 'directory' ? parent : null;
  showModal('New Folder', 'Folder name:', 'new-folder', name => {
    if (!name) return;
    const node = {id:uid(), name, type:'directory', children:[], path:tgt?(tgt.path||tgt.name)+'/'+name:name};
    if (tgt) { if (!tgt.children) tgt.children=[]; tgt.children.push(node); S.expanded.add(tgt.id); }
    else S.fileTree.push(node);
    S.expanded.add(node.id); renderSB(); notify('Created '+name,'success');
  });
}
function newFile() { newFileDlg(); }
function newFileUnder(parent) {
  showModal('New File', 'File name:', 'newfile.ts', name => {
    if (!name) return;
    const node = {id:uid(), name, type:'file', content:defContent(name, fileLang(name)), path:(parent.path||parent.name)+'/'+name};
    if (!parent.children) parent.children=[];
    parent.children.push(node); S.expanded.add(parent.id);
    renderSB(); openTabFor(node); notify('Created '+name,'success');
  });
}
function newFolderUnder(parent) {
  showModal('New Folder', 'Folder name:', 'new-folder', name => {
    if (!name) return;
    const node = {id:uid(), name, type:'directory', children:[], path:(parent.path||parent.name)+'/'+name};
    if (!parent.children) parent.children=[];
    parent.children.push(node); S.expanded.add(parent.id);
    renderSB(); notify('Created folder '+name,'success');
  });
}
function renameNode(n) {
  showModal('Rename', 'New name:', n.name, newName => {
    if (!newName || newName === n.name) return;
    const old = n.name;
    n.name = newName;
    n.path = (n.path||old).replace(old, newName);
    const tab = S.tabs.find(t => t.fileId === n.id);
    if (tab) { tab.name = newName; tab.path = n.path; tab.lang = fileLang(newName); renderTabs(); }
    renderSB(); notify('Renamed to '+newName,'success');
  });
}
function deleteNode(n) {
  if (!confirm(`Delete "${n.name}"?`)) return;
  removeNode(S.fileTree, n.id);
  const ti = S.tabs.findIndex(t => t.fileId === n.id);
  if (ti >= 0) { if (S.activeTab === S.tabs[ti].id) S.activeTab = S.tabs[ti-1]?.id || S.tabs[ti+1]?.id || null; S.tabs.splice(ti, 1); }
  renderSB(); renderTabs(); updateEditor(); notify('Deleted '+n.name,'warning');
}


// ── Open File / Folder from device ────────────────────────────────────────
function openFile() { const el = q('filein'); el.value=''; el.click(); }
function openFolder() { const el = q('folderin'); el.value=''; el.click(); }

function onFileIn(e) {
  const files = [...e.target.files];
  if (!files.length) return;
  files.forEach(f => {
    const r = new FileReader();
    r.onload = ev => {
      const node = {id:uid(), name:f.name, type:'file', content:ev.target.result, path:f.name};
      S.fileTree.push(node);
      if (S.panel === 'explorer') renderSB();
      openTabFor(node);
    };
    const ext = f.name.split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','gif','pdf','zip','exe','dll','woff','woff2','ttf','mp3','mp4'].includes(ext)) {
      const node = {id:uid(), name:f.name, type:'file', content:'[Binary file — cannot display]', path:f.name};
      S.fileTree.push(node);
      if (S.panel === 'explorer') renderSB();
      return;
    }
    r.readAsText(f);
  });
  notify(files.length === 1 ? `Opened ${files[0].name}` : `Opened ${files.length} files`, 'success');
}

function onFolderIn(e) {
  const files = [...e.target.files];
  if (!files.length) return;
  const firstPath = files[0].webkitRelativePath || files[0].name;
  const folderName = firstPath.split('/')[0];
  S.workspaceName = folderName;
  const el = q('wstitle'); if (el) el.textContent = folderName;
  const root = {id:uid(), name:folderName, type:'directory', children:[], path:folderName};
  const binary = ['png','jpg','jpeg','gif','bmp','ico','webp','pdf','zip','tar','gz','exe','dll','so','dylib','woff','woff2','ttf','eot','mp3','mp4','mov','avi','mkv'];
  const reads = files.map(f => new Promise(res => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (binary.includes(ext)) { res({f, content:'[Binary]'}); return; }
    const r = new FileReader();
    r.onload = ev => res({f, content:ev.target.result});
    r.onerror = () => res({f, content:''});
    r.readAsText(f);
  }));
  Promise.all(reads).then(results => {
    results.forEach(({f, content}) => {
      const rel = f.webkitRelativePath || f.name;
      const parts = rel.split('/');
      insertTree(root, parts.slice(1), content, rel);
    });
    S.fileTree = root.children;
    S.expanded.clear();
    S.expanded.add(root.id);
    root.children.forEach(c => { if (c.type === 'directory') S.expanded.add(c.id); });
    renderSB();
    notify('Opened folder: '+folderName, 'success');
    const first = flatFiles(S.fileTree)[0];
    if (first) openTabFor(first);
  });
}

function insertTree(parent, parts, content, fullPath) {
  if (!parts.length) return;
  if (parts.length === 1) {
    if (parts[0]) parent.children.push({id:uid(), name:parts[0], type:'file', content, path:fullPath});
    return;
  }
  const dname = parts[0];
  let dir = parent.children.find(c => c.name === dname && c.type === 'directory');
  if (!dir) { dir = {id:uid(), name:dname, type:'directory', children:[], path:fullPath.split('/').slice(0, fullPath.split('/').indexOf(parts[parts.length-1])).join('/')}; parent.children.push(dir); }
  insertTree(dir, parts.slice(1), content, fullPath);
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function openTabFor(n) {
  if (!n || n.type !== 'file') return;
  S.selectedId = n.id;
  const ex = S.tabs.find(t => t.fileId === n.id);
  if (ex) { S.activeTab = ex.id; renderTabs(); loadInEditor(ex); return; }
  const lang = fileLang(n.name);
  const tab = {id:uid(), fileId:n.id, name:n.name, path:n.path||n.name, lang, content:n.content||defContent(n.name,lang), dirty:false};
  S.tabs.push(tab);
  S.activeTab = tab.id;
  renderTabs(); loadInEditor(tab);
}

function renderTabs() {
  const bar = q('tabsbar');
  if (!S.tabs.length) { bar.innerHTML = ''; updateBreadcrumb(); return; }
  bar.innerHTML = S.tabs.map(t => `
    <div class="tab${t.id===S.activeTab?' act':''}" data-id="${t.id}"
      onclick="activateTab('${t.id}')"
      oncontextmenu="tabCtx(event,'${t.id}')"
      title="${esc(t.path)}">
      <span class="ti">${fileIcon(t.name)}</span>
      <span class="tn2">${esc(t.name)}</span>
      ${t.dirty
        ? `<span class="dd" title="Unsaved"></span>`
        : `<span class="tc" onclick="closeTab(event,'${t.id}')" title="Close">${I.close}</span>`}
    </div>`).join('');
  updateBreadcrumb();
  updateSB();
}

function activateTab(id) {
  saveEditorToTab();
  S.activeTab = id;
  renderTabs();
  const tab = S.tabs.find(t => t.id === id);
  if (tab) loadInEditor(tab);
}

function closeTab(e, id) {
  e.stopPropagation();
  const tab = S.tabs.find(t => t.id === id);
  if (tab?.dirty && !confirm(`Save changes to ${tab.name}?`)) return;
  const idx = S.tabs.findIndex(t => t.id === id);
  S.tabs.splice(idx, 1);
  if (S.activeTab === id) S.activeTab = S.tabs[Math.max(0, idx-1)]?.id || S.tabs[0]?.id || null;
  renderTabs(); updateEditor();
}
function closeActiveTab() { if (S.activeTab) closeTab({stopPropagation:()=>{}}, S.activeTab); }
function closeAllTabs() { S.tabs=[]; S.activeTab=null; renderTabs(); updateEditor(); }

function tabCtx(e, id) {
  e.preventDefault();
  const tab = S.tabs.find(t => t.id === id);
  if (!tab) return;
  showCtx(e.clientX, e.clientY, [
    {lbl:'Close', fn:()=>closeTab({stopPropagation:()=>{}},id)},
    {lbl:'Close Others', fn:()=>{S.tabs=S.tabs.filter(t=>t.id===id); S.activeTab=id; renderTabs();}},
    {lbl:'Close All', fn:closeAllTabs},
    {sep:1},
    {lbl:'Copy Path', fn:()=>{navigator.clipboard?.writeText(tab.path); notify('Copied');}},
    {sep:1},
    {lbl:'Reveal in Explorer', fn:()=>{S.selectedId=tab.fileId; switchP('explorer');}},
  ]);
}

function updateBreadcrumb() {
  const tab = S.tabs.find(t => t.id === S.activeTab);
  const bc = q('bc');
  if (!tab || !bc) return;
  const parts = tab.path.split('/').filter(Boolean);
  bc.innerHTML = parts.map((p,i) =>
    `<span class="bs${i===parts.length-1?' bc-cur':''}">${esc(p)}</span>${i<parts.length-1?'<span class="bsep">›</span>':''}`
  ).join('');
}


// ── Monaco Editor ──────────────────────────────────────────────────────────
function loadMonaco(cb) {
  if (window.monaco) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
  s.onload = () => {
    require.config({paths:{vs:'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs'}});
    require(['vs/editor/editor.main'], cb);
  };
  document.head.appendChild(s);
}

function initMonaco(tab) {
  const mount = q('monacoMount');
  if (!mount) return;
  if (S.monacoEditor) { loadInEditor(tab); return; }
  loadMonaco(() => {
    const m = window.monaco;
    S.monaco = m;
    // Full VS Code Dark+ color theme
    m.editor.defineTheme('vscode-dark-plus', {
      base:'vs-dark', inherit:true,
      rules:[
        {token:'comment', foreground:'6A9955', fontStyle:'italic'},
        {token:'comment.block', foreground:'6A9955', fontStyle:'italic'},
        {token:'comment.line', foreground:'6A9955', fontStyle:'italic'},
        {token:'keyword', foreground:'569CD6'},
        {token:'keyword.control', foreground:'C586C0'},
        {token:'keyword.operator', foreground:'569CD6'},
        {token:'keyword.other', foreground:'569CD6'},
        {token:'keyword.declaration', foreground:'569CD6'},
        {token:'storage', foreground:'569CD6'},
        {token:'storage.type', foreground:'569CD6'},
        {token:'storage.modifier', foreground:'569CD6'},
        {token:'string', foreground:'CE9178'},
        {token:'string.quoted', foreground:'CE9178'},
        {token:'string.template', foreground:'CE9178'},
        {token:'string.escape', foreground:'D7BA7D'},
        {token:'string.regexp', foreground:'D16969'},
        {token:'number', foreground:'B5CEA8'},
        {token:'number.hex', foreground:'B5CEA8'},
        {token:'number.float', foreground:'B5CEA8'},
        {token:'regexp', foreground:'D16969'},
        {token:'type', foreground:'4EC9B0'},
        {token:'type.identifier', foreground:'4EC9B0'},
        {token:'class', foreground:'4EC9B0'},
        {token:'class.name', foreground:'4EC9B0'},
        {token:'interface', foreground:'4EC9B0'},
        {token:'enum', foreground:'4EC9B0'},
        {token:'function', foreground:'DCDCAA'},
        {token:'function.call', foreground:'DCDCAA'},
        {token:'method', foreground:'DCDCAA'},
        {token:'variable', foreground:'9CDCFE'},
        {token:'variable.other', foreground:'9CDCFE'},
        {token:'variable.parameter', foreground:'9CDCFE'},
        {token:'variable.language', foreground:'569CD6'},
        {token:'constant', foreground:'4FC1FF'},
        {token:'constant.language', foreground:'569CD6'},
        {token:'constant.numeric', foreground:'B5CEA8'},
        {token:'support.function', foreground:'DCDCAA'},
        {token:'support.class', foreground:'4EC9B0'},
        {token:'support.type', foreground:'4EC9B0'},
        {token:'support.constant', foreground:'4FC1FF'},
        {token:'support.variable', foreground:'9CDCFE'},
        {token:'entity.name.function', foreground:'DCDCAA'},
        {token:'entity.name.type', foreground:'4EC9B0'},
        {token:'entity.name.class', foreground:'4EC9B0'},
        {token:'entity.name.tag', foreground:'569CD6'},
        {token:'entity.other.attribute-name', foreground:'9CDCFE'},
        {token:'entity.other.inherited-class', foreground:'4EC9B0'},
        {token:'markup.heading', foreground:'569CD6', fontStyle:'bold'},
        {token:'markup.bold', fontStyle:'bold'},
        {token:'markup.italic', fontStyle:'italic'},
        {token:'markup.underline.link', foreground:'569CD6'},
        {token:'markup.inline.raw', foreground:'CE9178'},
        {token:'punctuation', foreground:'D4D4D4'},
        {token:'delimiter', foreground:'D4D4D4'},
        {token:'operator', foreground:'D4D4D4'},
        {token:'tag', foreground:'569CD6'},
        {token:'attribute.name', foreground:'9CDCFE'},
        {token:'attribute.value', foreground:'CE9178'},
        {token:'namespace', foreground:'4EC9B0'},
        {token:'decorator', foreground:'DCDCAA'},
        {token:'meta.decorator', foreground:'DCDCAA'},
        {token:'invalid', foreground:'F44747'},
        {token:'invalid.deprecated', foreground:'F44747', fontStyle:'italic'},
      ],
      colors:{
        'editor.background':'#1e1e1e',
        'editor.foreground':'#d4d4d4',
        'editor.lineHighlightBackground':'#2d2d2d',
        'editor.selectionBackground':'#264f78',
        'editor.selectionHighlightBackground':'#3a3d4166',
        'editor.wordHighlightBackground':'#575757b8',
        'editor.wordHighlightStrongBackground':'#004972b8',
        'editorCursor.foreground':'#aeafad',
        'editorWhitespace.foreground':'#3b3b3b',
        'editorIndentGuide.background':'#404040',
        'editorIndentGuide.activeBackground':'#707070',
        'editorLineNumber.foreground':'#858585',
        'editorLineNumber.activeForeground':'#c6c6c6',
        'editorBracketMatch.background':'#0d3a58',
        'editorBracketMatch.border':'#888888',
        'editorBracketHighlight.foreground1':'#ffd700',
        'editorBracketHighlight.foreground2':'#da70d6',
        'editorBracketHighlight.foreground3':'#87ceeb',
        'editorGutter.background':'#1e1e1e',
        'editor.findMatchBackground':'#613315',
        'editor.findMatchHighlightBackground':'#3a2c00',
        'editorWidget.background':'#252526',
        'editorWidget.border':'#454545',
        'editorSuggestWidget.background':'#252526',
        'editorSuggestWidget.border':'#454545',
        'editorSuggestWidget.foreground':'#d4d4d4',
        'editorSuggestWidget.selectedBackground':'#094771',
        'editorSuggestWidget.highlightForeground':'#18a3ff',
        'editorHoverWidget.background':'#252526',
        'editorHoverWidget.border':'#454545',
        'editorOverviewRuler.border':'#00000000',
        'scrollbar.shadow':'#000000',
        'scrollbarSlider.background':'#42424270',
        'scrollbarSlider.hoverBackground':'#646464b3',
        'scrollbarSlider.activeBackground':'#bfbfbf66',
        'peekView.border':'#007acc',
        'peekViewEditor.background':'#001f33',
        'peekViewResult.background':'#252526',
        'badge.background':'#4d4d4d',
        'badge.foreground':'#cccccc',
        'input.background':'#3c3c3c',
        'input.foreground':'#cccccc',
        'input.border':'#3c3c3c',
        'input.placeholderForeground':'#a6a6a6',
        'dropdown.background':'#3c3c3c',
        'dropdown.foreground':'#f0f0f0',
        'list.activeSelectionBackground':'#094771',
        'list.activeSelectionForeground':'#ffffff',
        'list.hoverBackground':'#2a2d2e',
        'terminal.background':'#1e1e1e',
        'terminal.foreground':'#cccccc',
        'terminal.ansiBlack':'#1e1e1e',
        'terminal.ansiRed':'#f44747',
        'terminal.ansiGreen':'#4ec9b0',
        'terminal.ansiYellow':'#dcdcaa',
        'terminal.ansiBlue':'#569cd6',
        'terminal.ansiMagenta':'#c678dd',
        'terminal.ansiCyan':'#56b6c2',
        'terminal.ansiWhite':'#d4d4d4',
        'terminal.ansiBrightBlack':'#808080',
        'terminal.ansiBrightRed':'#f44747',
        'terminal.ansiBrightGreen':'#4ec9b0',
        'terminal.ansiBrightYellow':'#dcdcaa',
        'terminal.ansiBrightBlue':'#569cd6',
        'terminal.ansiBrightMagenta':'#c678dd',
        'terminal.ansiBrightCyan':'#56b6c2',
        'terminal.ansiBrightWhite':'#ffffff',
      }
    });
    m.editor.setTheme('vscode-dark-plus');

    S.monacoEditor = m.editor.create(q('monacoMount'), {
      value: tab?.content || '',
      language: tab?.lang || 'plaintext',
      theme: 'vscode-dark-plus',
      fontSize: S.fontSize,
      fontFamily: "'Cascadia Code','JetBrains Mono','Fira Code',Consolas,'Courier New',monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      minimap: {enabled:true, maxColumn:80},
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'off',
      tabSize: 2, insertSpaces: true, detectIndentation: true,
      formatOnPaste: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {other:true, comments:false, strings:true},
      quickSuggestionsDelay: 80,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      parameterHints: {enabled:true},
      suggest: {
        showMethods:true, showFunctions:true, showConstructors:true, showDeprecated:true,
        showFields:true, showVariables:true, showClasses:true, showModules:true,
        showProperties:true, showEvents:true, showOperators:true, showKeywords:true,
        showWords:true, showColors:true, showFiles:true, showReferences:true,
        showSnippets:true, showUsers:true, showIssues:true,
        insertMode:'insert', snippetsPreventQuickSuggestions:false,
        localityBonus:true, shareSuggestSelections:true,
      },
      hover: {enabled:true, delay:200},
      inlineSuggest: {enabled:true},
      snippetSuggestions: 'top',
      wordBasedSuggestions: true,
      wordBasedSuggestionsOnlySameLanguage: false,
      bracketPairColorization: {enabled:true, independentColorPoolPerBracketType:true},
      guides: {bracketPairs:true, indentation:true, highlightActiveIndentation:true},
      renderWhitespace: 'selection',
      renderLineHighlight: 'all',
      selectionHighlight: true,
      occurrencesHighlight: true,
      folding: true, foldingHighlight: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'mouseover',
      cursorBlinking: 'blink',
      cursorSmoothCaretAnimation: 'on',
      cursorStyle: 'line',
      smoothScrolling: true,
      mouseWheelZoom: true,
      multiCursorModifier: 'alt',
      padding: {top:8, bottom:8},
      scrollbar: {verticalScrollbarSize:8, horizontalScrollbarSize:8, useShadows:false},
      overviewRulerBorder: false,
      contextmenu: true,
      colorDecorators: true,
      codeLens: true,
      lightbulb: {enabled:true},
      accessibilitySupport: 'off',
      copyWithSyntaxHighlighting: true,
      links: true,
      renderControlCharacters: false,
      comments: {insertSpace:true},
      find: {addExtraSpaceOnTop:true, autoFindInSelection:'never', seedSearchStringFromSelection:'selection'},
    });

    // Configure TypeScript
    m.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: m.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true, moduleResolution: m.languages.typescript.ModuleResolutionKind.NodeJs,
      module: m.languages.typescript.ModuleKind.CommonJS, noEmit: true, esModuleInterop: true,
      jsx: m.languages.typescript.JsxEmit.ReactJSX, allowJs: true, checkJs: false,
      strict: false, allowSyntheticDefaultImports: true, resolveJsonModule: true,
    });
    m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({noSemanticValidation:false, noSyntaxValidation:false});
    m.languages.typescript.javascriptDefaults.setDiagnosticsOptions({noSemanticValidation:true, noSyntaxValidation:false});

    // Cursor tracking
    S.monacoEditor.onDidChangeCursorPosition(e => {
      S.curLine = e.position.lineNumber; S.curCol = e.position.column; updateSB();
    });
    // Content change tracking
    S.monacoEditor.onDidChangeModelContent(() => {
      const t = S.tabs.find(t => t.id === S.activeTab);
      if (t) { t.content = S.monacoEditor.getValue(); t.dirty = true; renderTabs(); }
    });

    // Key bindings
    const K = m.KeyCode, M = m.KeyMod;
    S.monacoEditor.addCommand(M.CtrlCmd|K.KeyS, saveActive);
    S.monacoEditor.addCommand(M.CtrlCmd|K.KeyW, closeActiveTab);
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyP, openCmd);
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyE, ()=>switchP('explorer'));
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyF, ()=>switchP('search'));
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyG, ()=>switchP('git'));
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyX, ()=>switchP('extensions'));
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyD, ()=>switchP('debug'));
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyA, ()=>switchP('ai'));
    S.monacoEditor.addCommand(M.CtrlCmd|K.KeyB, toggleSB);
    S.monacoEditor.addCommand(M.CtrlCmd|K.Backquote, toggleBP);
    S.monacoEditor.addCommand(M.CtrlCmd|K.KeyN, newFile);
    S.monacoEditor.addCommand(M.CtrlCmd|K.KeyO, openFile);
    S.monacoEditor.addCommand(M.CtrlCmd|M.Shift|K.KeyS, saveAs);
    S.monacoEditor.addCommand(M.Alt|K.KeyZ, toggleWW);
    S.monacoEditor.addCommand(M.CtrlCmd|K.Equal, ()=>changeFS(1));
    S.monacoEditor.addCommand(M.CtrlCmd|K.Minus, ()=>changeFS(-1));
    S.monacoEditor.addCommand(M.CtrlCmd|K.Digit0, ()=>changeFS(0));
    S.monacoEditor.addCommand(K.F5, runFile);
    S.monacoEditor.addCommand(M.CtrlCmd|K.KeyP, openCmd);

    // AI right-click actions
    S.monacoEditor.addAction({id:'ai-explain', label:'AI: Explain Selection', contextMenuGroupId:'ai', contextMenuOrder:1,
      run: ed => { const sel=ed.getSelection(); const code=ed.getModel()?.getValueInRange(sel)||ed.getValue(); switchP('ai'); setTimeout(()=>aiSendMsg(`Explain this ${S.lang} code:\n\`\`\`${S.lang}\n${code}\n\`\`\``),50); }});
    S.monacoEditor.addAction({id:'ai-fix', label:'AI: Fix Issues', contextMenuGroupId:'ai', contextMenuOrder:2,
      run: ed => { const code=ed.getValue(); switchP('ai'); setTimeout(()=>aiSendMsg(`Find and fix all bugs in this ${S.lang} code:\n\`\`\`${S.lang}\n${code}\n\`\`\``),50); }});
    S.monacoEditor.addAction({id:'ai-refactor', label:'AI: Refactor Code', contextMenuGroupId:'ai', contextMenuOrder:3,
      run: ed => { const sel=ed.getSelection(); const code=ed.getModel()?.getValueInRange(sel)||ed.getValue(); switchP('ai'); setTimeout(()=>aiSendMsg(`Refactor this ${S.lang} code for better quality:\n\`\`\`${S.lang}\n${code}\n\`\`\``),50); }});
    S.monacoEditor.addAction({id:'ai-docs', label:'AI: Add Documentation', contextMenuGroupId:'ai', contextMenuOrder:4,
      run: ed => { const code=ed.getValue(); switchP('ai'); setTimeout(()=>aiSendMsg(`Add comprehensive JSDoc/docstring documentation to:\n\`\`\`${S.lang}\n${code}\n\`\`\``),50); }});
    S.monacoEditor.addAction({id:'ai-tests', label:'AI: Generate Tests', contextMenuGroupId:'ai', contextMenuOrder:5,
      run: ed => { const code=ed.getValue(); switchP('ai'); setTimeout(()=>aiSendMsg(`Write unit tests for this ${S.lang} code:\n\`\`\`${S.lang}\n${code}\n\`\`\``),50); }});

    q('placeholder').style.display = 'none';
    q('monacoMount').style.display = 'block';
    if (tab) updateSB();
  });
}

function loadInEditor(tab) {
  if (!tab) return;
  S.lang = tab.lang;
  q('placeholder').style.display = 'none';
  q('monacoMount').style.display = 'block';
  if (!S.monacoEditor) { initMonaco(tab); return; }
  const m = S.monaco;
  const model = m.editor.createModel(tab.content || '', tab.lang);
  S.monacoEditor.setModel(model);
  m.editor.setTheme('vscode-dark-plus');
  S.monacoEditor.focus();
  updateSB(); updateBreadcrumb();
}

function updateEditor() {
  const tab = S.tabs.find(t => t.id === S.activeTab);
  if (!tab) {
    q('placeholder').style.display = 'flex';
    q('monacoMount').style.display = 'none';
    q('bc').innerHTML = '';
    return;
  }
  loadInEditor(tab);
}

function saveEditorToTab() {
  if (!S.monacoEditor) return;
  const t = S.tabs.find(t => t.id === S.activeTab);
  if (t) t.content = S.monacoEditor.getValue();
}

function saveActive() {
  saveEditorToTab();
  const t = S.tabs.find(t => t.id === S.activeTab);
  if (!t) return;
  t.dirty = false;
  const n = findNode(S.fileTree, t.fileId);
  if (n) n.content = t.content;
  renderTabs();
  notify('Saved '+t.name,'success');
}

function saveAs() {
  saveEditorToTab();
  const t = S.tabs.find(t => t.id === S.activeTab);
  if (!t) { notify('No file open','warning'); return; }
  const blob = new Blob([t.content], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = t.name; a.click();
  URL.revokeObjectURL(a.href);
  notify('Downloaded '+t.name,'success');
}
function saveAll() {
  saveEditorToTab();
  S.tabs.forEach(t => { t.dirty=false; const n=findNode(S.fileTree,t.fileId); if(n) n.content=t.content; });
  renderTabs(); notify('All files saved','success');
}

function mcmd(cmd) { S.monacoEditor?.getAction?.(cmd)?.run() || S.monacoEditor?.trigger?.('',''+cmd,null); }
function toggleWW() { if(!S.monacoEditor) return; const c=S.monacoEditor.getOption(S.monaco.editor.EditorOption.wordWrap); S.monacoEditor.updateOptions({wordWrap:c==='off'?'on':'off'}); notify(`Word wrap ${c==='off'?'on':'off'}`); }
function toggleMM() { if(!S.monacoEditor) return; const c=S.monacoEditor.getOption(S.monaco.editor.EditorOption.minimap); S.monacoEditor.updateOptions({minimap:{enabled:!c.enabled}}); notify(`Minimap ${!c.enabled?'on':'off'}`); }
function changeFS(d) {
  if (d===0) S.fontSize=14; else S.fontSize=Math.max(8,Math.min(32,S.fontSize+d));
  S.monacoEditor?.updateOptions({fontSize:S.fontSize});
}


// ── Status Bar ─────────────────────────────────────────────────────────────
function updateSB() {
  const t = S.tabs.find(t => t.id === S.activeTab);
  q('sbcur').textContent = `Ln ${S.curLine}, Col ${S.curCol}`;
  const lang = t?.lang || 'plaintext';
  S.lang = lang;
  q('sblang').textContent = LANG_NAMES[lang] || lang;
}

// ── Bottom Panel ───────────────────────────────────────────────────────────
function switchBP(name) {
  S.bottomTab = name;
  qa('.ptab').forEach(t => t.classList.toggle('act', t.dataset.t === name));
  renderBP();
  if (!S.bottomOpen) { S.bottomOpen=true; q('bottompanel').style.display='flex'; q('bresize').style.display='block'; }
}

function renderBP() {
  const pc = q('panelcontent');
  if (!pc) return;
  pc.style.flexDirection = 'column';
  switch (S.bottomTab) {
    case 'terminal': renderTerminal(pc); break;
    case 'output':
      pc.innerHTML = `<div style="flex:1;overflow-y:auto;padding:8px 12px;font-family:monospace;font-size:12.5px;line-height:1.6">
        <div class="tinf">[AI Web IDE] Output Panel initialized</div>
        <div class="tsuc">✓ Monaco Editor v0.44.0 loaded</div>
        <div class="tinf">Workspace: ${esc(S.workspaceName)}</div>
        ${S.openaiKey ? '<div class="tsuc">✓ OpenAI API connected</div>' : '<div class="twrn">⚠ OpenAI key not set — add in AI panel</div>'}
      </div>`; break;
    case 'problems':
      pc.innerHTML = `<div style="flex:1;overflow-y:auto;padding:8px 12px;font-size:12px">
        ${S.problems.length ? S.problems.map(p=>`<div style="display:flex;gap:8px;padding:3px 0"><span>${p.type==='error'?'✕':'⚠'}</span><span style="color:var(--tx)">${esc(p.msg)}</span><span style="color:var(--mt)">${p.loc||''}</span></div>`).join('') : '<div style="color:var(--mt)">No problems detected in workspace.</div>'}
      </div>`; break;
    case 'ports':
      pc.innerHTML = `<div style="flex:1;overflow-y:auto;padding:8px 12px;font-size:12px;color:var(--mt)">No forwarded ports. Forwarding ports allows you to access running services.</div>`; break;
  }
}

// ── Terminal ───────────────────────────────────────────────────────────────
function renderTerminal(pc) {
  if (q('termout')) return;
  pc.innerHTML = `<div id="termout"></div><div id="terminputrow"><span id="tprompt">$ </span><input id="termin" spellcheck="false" autocomplete="off" placeholder="Type command…" onkeydown="termKey(event)"/></div>`;
  initTerm();
  q('termin').focus();
}

function initTerm() {
  const out = q('termout');
  if (!out) return;
  out.innerHTML = `<div class="tinf">   ___  _____   _       __     __         ____  ____  ____</div>
<div class="tinf">  / _ |/  _/  | |     / /__  / /        /  _/ / __ \\/ __/</div>
<div class="tinf"> / __ |/ /    | | /| / / -_)/ _ \\      _/ /  / /_/ / _/  </div>
<div class="tinf">/_/ |_/___/   |__/|__/\\__//_.__/     /___/ /_____/___/  </div>
<div class="tmt">─────────────────────────────────────────────────────</div>
<div class="tmt">Terminal ready. Type <span class="tsuc">help</span> for available commands.</div>
<div style="height:4px"></div>`;
  S.termHistory = []; S.termHistIdx = -1;
}

function newTerm() { switchBP('terminal'); const pc=q('panelcontent'); if(pc){pc.innerHTML='';} renderBP(); notify('New terminal','success'); }
function clearTerm() { const out=q('termout'); if(out) out.innerHTML=''; }

function termKey(e) {
  const inp = q('termin'); if (!inp) return;
  if (e.key === 'Enter') {
    const cmd = inp.value.trim(); inp.value = '';
    if (cmd) { S.termHistory.unshift(cmd); S.termHistIdx = -1; }
    termPrint(`<span class="tcmd">$ ${esc(cmd)}</span>\n`);
    if (cmd) execCmd(cmd);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (S.termHistory.length) { S.termHistIdx=Math.min(S.termHistIdx+1,S.termHistory.length-1); inp.value=S.termHistory[S.termHistIdx]||''; }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault(); S.termHistIdx=Math.max(S.termHistIdx-1,-1); inp.value=S.termHistIdx>=0?S.termHistory[S.termHistIdx]:'';
  } else if (e.ctrlKey && e.key==='l') { e.preventDefault(); clearTerm(); }
  else if (e.ctrlKey && e.key==='c') { e.preventDefault(); termPrint('<span class="twrn">^C</span>\n'); inp.value=''; }
  else if (e.key==='Tab') { e.preventDefault(); autoCompleteCmd(inp); }
}

function termPrint(html) {
  const out = q('termout');
  if (!out) { switchBP('terminal'); setTimeout(()=>termPrint(html),200); return; }
  const d=document.createElement('div'); d.innerHTML=html; out.appendChild(d);
  out.scrollTop=out.scrollHeight;
}

function autoCompleteCmd(inp) {
  const v = inp.value; const cmds=['help','ls','ls -la','pwd','echo','clear','date','node','npm','python','git','cat','mkdir','touch','history','whoami','env','version'];
  const match = cmds.filter(c=>c.startsWith(v));
  if (match.length===1) inp.value=match[0]; else if (match.length>1) termPrint('<span class="tmt">'+match.join('  ')+'</span>\n');
}

function runFile() {
  const t = S.tabs.find(t => t.id === S.activeTab);
  if (!t) { notify('No file open','warning'); return; }
  switchBP('terminal');
  const ext = t.name.split('.').pop().toLowerCase();
  const runners = {js:'node',ts:'ts-node',py:'python3',rb:'ruby',go:'go run',rs:'cargo run',php:'php',java:'java',cpp:'g++ -o out && ./out',c:'gcc -o out && ./out'};
  const runner = runners[ext] || 'node';
  setTimeout(() => {
    termPrint(`<span class="tcmd">$ ${runner} ${esc(t.name)}</span>\n`);
    termPrint(`<span class="tinf">Running ${esc(t.name)}…\n</span>`);
    setTimeout(() => {
      // Simulate simple JS execution
      if (ext==='js'||ext==='ts') {
        try {
          const lines=[]; const origLog=console.log; console.log=(...a)=>lines.push(a.map(String).join(' '));
          if(ext==='js') eval(t.content);
          console.log=origLog;
          if(lines.length) lines.forEach(l=>termPrint(`<span class="tc2">${esc(l)}\n</span>`));
          else termPrint(`<span class="tsuc">✓ Completed with no output\n</span>`);
        } catch(err) { termPrint(`<span class="ter">${esc(err.message)}\n</span>`); console.log=window._origLog||console.log; }
      } else {
        termPrint(`<span class="tsuc">✓ Execution complete\n</span>`);
        termPrint(`<span class="tmt">  (Connect backend server for real ${runner} execution)\n</span>`);
      }
    }, 400);
  }, 50);
}

function execCmd(cmd) {
  const parts = cmd.trim().split(/\s+/);
  const base = parts[0].toLowerCase();
  const args = parts.slice(1);
  const full = cmd.toLowerCase().trim();
  const cmds = {
    'help':()=>`<span class="tinf">Commands: help ls pwd echo clear date node npm python git cat mkdir touch rm whoami env history version</span>`,
    'ls':()=>`<span class="tinf">src/</span>  <span class="tinf">server/</span>  <span class="tsuc">package.json</span>  <span class="tsuc">tsconfig.json</span>  <span class="tsuc">README.md</span>  <span class="tsuc">.env</span>`,
    'ls -la':()=>`<span class="tmt">total 64\ndrwxr-xr-x  8 user staff  256 ${new Date().toDateString()} .\ndrwxr-xr-x  3 user staff   96 ${new Date().toDateString()} ..\n</span><span class="tinf">drwxr-xr-x 12 user staff  384 ${new Date().toDateString()} src\ndrwxr-xr-x  6 user staff  192 ${new Date().toDateString()} server\n</span><span class="tsuc">-rw-r--r--  1 user staff 1024 ${new Date().toDateString()} package.json</span>`,
    'ls -l':()=>cmds['ls -la'](),
    'dir':()=>cmds['ls'](),
    'pwd':()=>`<span class="tsuc">/workspace/${esc(S.workspaceName)}</span>`,
    'whoami':()=>`<span class="tsuc">developer</span>`,
    'date':()=>`<span class="tsuc">${new Date().toString()}</span>`,
    'clear':()=>{clearTerm();return null;},
    'cls':()=>{clearTerm();return null;},
    'version':()=>`<span class="tinf">AI Web IDE v1.0.0 (VS Code-style)\nNode.js v20.10.0 (simulated)\nnpm v10.2.0 (simulated)</span>`,
    'env':()=>`<span class="tinf">NODE_ENV=development\nPATH=/usr/local/bin:/usr/bin:/bin\nHOME=/workspace/${esc(S.workspaceName)}\nSHELL=/bin/bash\nTERM=xterm-256color</span>`,
    'history':()=>S.termHistory.slice(0,20).map((h,i)=>`<span class="tmt">${String(i+1).padStart(4,'·')}  ${esc(h)}</span>`).join('\n'),
    'node -v':()=>`<span class="tsuc">v20.10.0</span>`,
    'node --version':()=>`<span class="tsuc">v20.10.0</span>`,
    'npm -v':()=>`<span class="tsuc">10.2.0</span>`,
    'npm --version':()=>`<span class="tsuc">10.2.0</span>`,
    'npm init':()=>`<span class="twrn">⚠ npm init — connect backend server for real npm</span>`,
    'npm install':()=>`<span class="twrn">⚠ Connect backend server for npm install</span>`,
    'npm i':()=>`<span class="twrn">⚠ Connect backend server for npm i</span>`,
    'npm run dev':()=>`<span class="twrn">⚠ Connect backend server for npm run dev</span>`,
    'npm run build':()=>`<span class="twrn">⚠ Connect backend server for npm run build</span>`,
    'python --version':()=>`<span class="tsuc">Python 3.11.5</span>`,
    'python3 --version':()=>`<span class="tsuc">Python 3.11.5</span>`,
    'git --version':()=>`<span class="tsuc">git version 2.43.0</span>`,
    'git status':()=>`<span class="tinf">On branch ${esc(S.gitBranch)}\nYour branch is up to date with 'origin/${esc(S.gitBranch)}'.\n\nnothing to commit, working tree clean</span>`,
    'git log':()=>`<span class="twrn">commit a1b2c3d4e5f67890 (HEAD -> ${esc(S.gitBranch)}, origin/${esc(S.gitBranch)})\nAuthor: Developer &lt;dev@example.com&gt;\nDate:   ${new Date().toDateString()}\n\n    Initial commit</span>`,
    'git log --oneline':()=>`<span class="tinf">a1b2c3d (HEAD -> ${esc(S.gitBranch)}) Initial commit</span>`,
    'git branch':()=>`<span class="tsuc">* ${esc(S.gitBranch)}</span>`,
    'git init':()=>`<span class="tsuc">Initialized empty Git repository in /workspace/${esc(S.workspaceName)}/.git/</span>`,
    'git diff':()=>`<span class="tmt">No changes detected</span>`,
    'git add .':()=>`<span class="tsuc">Changes staged</span>`,
    'git stash':()=>`<span class="tsuc">Saved working directory and index state</span>`,
  };
  // full match
  if (cmds[full]) { const r=cmds[full](); if(r!==null) termPrint(r+'\n'); return; }
  // base match
  if (cmds[base]) { const r=cmds[base](); if(r!==null) termPrint(r+'\n'); return; }
  // echo
  if (base==='echo') { termPrint(`<span class="tc2">${esc(args.join(' ').replace(/^["']|["']$/g,''))}\n</span>`); return; }
  // cat
  if (base==='cat') {
    const fname=args[0];
    if(!fname){termPrint(`<span class="ter">cat: missing operand\n</span>`);return;}
    const n=findFileByName(S.fileTree,fname)||flatFiles(S.fileTree).find(f=>f.path===fname);
    if(n&&n.type==='file'){termPrint(`<span class="tc2">${esc(n.content||'')}\n</span>`);}
    else{termPrint(`<span class="ter">cat: ${esc(fname)}: No such file or directory\n</span>`);}
    return;
  }
  // mkdir
  if (base==='mkdir') {
    if(!args[0]){termPrint(`<span class="ter">mkdir: missing operand\n</span>`);return;}
    S.fileTree.push({id:uid(),name:args[0],type:'directory',children:[],path:args[0]});
    if(S.panel==='explorer') renderSB();
    termPrint(`<span class="tsuc">Created directory ${esc(args[0])}\n</span>`); return;
  }
  // touch
  if (base==='touch') {
    if(!args[0]){termPrint(`<span class="ter">touch: missing operand\n</span>`);return;}
    S.fileTree.push({id:uid(),name:args[0],type:'file',content:'',path:args[0]});
    if(S.panel==='explorer') renderSB();
    termPrint(`<span class="tsuc">Created ${esc(args[0])}\n</span>`); return;
  }
  // cd
  if (base==='cd') { termPrint(`<span class="tmt">Changed to /workspace/${esc(args[0]||S.workspaceName)}\n</span>`); return; }
  // git commit
  if (full.startsWith('git commit')) { termPrint(`<span class="tsuc">[${esc(S.gitBranch)} a1b2c3d] ${esc(args.slice(2).join(' '))}\n</span>`); return; }
  // node/python execution
  if (base==='node'&&args[0]) { termPrint(`<span class="twrn">⚠ Connect backend server for real Node.js execution\n</span>`); return; }
  if ((base==='python'||base==='python3')&&args[0]) { termPrint(`<span class="twrn">⚠ Connect backend server for real Python execution\n</span>`); return; }
  // rm
  if (base==='rm') { termPrint(`<span class="twrn">rm: use Explorer panel to delete files safely\n</span>`); return; }
  // not found
  termPrint(`<span class="ter">bash: ${esc(base)}: command not found\n</span>`);
}


// ── Search Panel ──────────────────────────────────────────────────────────
function searchHTML() {
  return `<div class="ph">Search</div>
  <div id="searchpanel">
    <div class="siw"><span style="color:var(--mt);font-size:14px">🔍</span>
      <input id="searchin" placeholder="Search" value="${esc(S.searchQ)}" /></div>
    <div class="siw"><span style="color:var(--mt);font-size:14px">↔</span>
      <input id="replacein" placeholder="Replace" value="${esc(S.replaceQ)}" />
      <button class="ib" onclick="doReplaceAll()" title="Replace All" style="font-size:10px;width:28px">All</button>
    </div>
    <div id="searchres">
      ${S.searchResults.length===0 && S.searchQ
        ? '<div style="padding:8px;color:var(--mt);font-size:12px">No results found.</div>'
        : S.searchResults.map(r=>`
          <div class="srf">${fileIcon(r.file.name)} ${esc(r.file.name)}
            <span style="color:var(--mt);margin-left:4px;font-weight:400">(${r.matches.length})</span></div>
          ${r.matches.map(m=>`
            <div class="srm" onclick="jumpToMatch('${r.file.id}',${m.line})" title="Line ${m.line}">
              <span style="color:var(--mt);margin-right:6px">${m.line}</span>
              ${m.text.replace(new RegExp('('+escRe(S.searchQ)+')','gi'),'<mark>$1</mark>')}
            </div>`).join('')}`).join('')}
    </div>
  </div>`;
}

function doSearch(q) {
  S.searchQ = q;
  if (!q) { S.searchResults = []; renderSB(); return; }
  const results = [];
  function search(nodes) {
    nodes.forEach(n => {
      if (n.type==='file' && n.content) {
        const lines = n.content.split('\n');
        const matches = [];
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(q.toLowerCase()))
            matches.push({line:i+1, text:line.trim().slice(0,80)});
        });
        if (matches.length) results.push({file:n, matches});
      }
      if (n.children) search(n.children);
    });
  }
  search(S.fileTree);
  S.searchResults = results;
  renderSB();
}

function doReplaceAll() {
  if (!S.searchQ || !S.replaceQ) return;
  let count = 0;
  function rep(nodes) {
    nodes.forEach(n => {
      if (n.type==='file' && n.content && n.content.includes(S.searchQ)) {
        n.content = n.content.split(S.searchQ).join(S.replaceQ); count++;
        const t = S.tabs.find(t => t.fileId===n.id);
        if (t) { t.content=n.content; t.dirty=true; if (t.id===S.activeTab && S.monacoEditor) S.monacoEditor.setValue(n.content); }
      }
      if (n.children) rep(n.children);
    });
  }
  rep(S.fileTree); renderTabs();
  notify(`Replaced in ${count} file(s)`,'success');
}

function jumpToMatch(fileId, line) {
  const n = findNode(S.fileTree, fileId);
  if (!n) return;
  openTabFor(n);
  setTimeout(() => { if (S.monacoEditor) { S.monacoEditor.revealLineInCenter(line); S.monacoEditor.setPosition({lineNumber:line,column:1}); } }, 300);
}

// ── Git Panel ─────────────────────────────────────────────────────────────
function gitHTML() {
  const changes = S.tabs.filter(t=>t.dirty).map(t=>({name:t.name,status:'M'}));
  return `<div class="ph">Source Control <div class="pa">
    <button class="ib" onclick="notify('Refresh','info')" title="Refresh">${I.refresh}</button>
    <button class="ib" onclick="doCommit()" title="Commit" style="font-size:14px">✓</button>
  </div></div>
  <div id="gitpanel">
    <textarea id="gcin" placeholder="Message (Ctrl+Enter to commit on '${esc(S.gitBranch)}')" onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter')doCommit()"></textarea>
    <div class="gbtn" onclick="doCommit()">✓ Commit to ${esc(S.gitBranch)}</div>
    <div style="margin-top:8px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--mt);padding:4px 0;letter-spacing:.06em">
        CHANGES (${changes.length})</div>
      ${changes.length===0
        ? '<div style="color:var(--mt);font-size:12px;padding:4px 0">No changes in working tree</div>'
        : changes.map(c=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px">
            <span style="color:#4ec9b0;font-weight:700;font-size:11px">${c.status}</span>
            <span style="color:var(--tx)">${esc(c.name)}</span></div>`).join('')}
    </div>
    <div style="margin-top:10px;border-top:1px solid var(--bdr);padding-top:8px;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--mt)">
      ${I.gitsym.replace('viewBox','style="width:14px;height:14px" viewBox')}
      <span>${esc(S.gitBranch)}</span>
      <span style="margin-left:auto;display:flex;gap:8px">
        <span style="color:var(--ac);cursor:pointer" onclick="notify('Pushed to origin/'+S.gitBranch,'success')">↑ Push</span>
        <span style="color:var(--ac);cursor:pointer" onclick="notify('Pulled from origin/'+S.gitBranch,'success')">↓ Pull</span>
      </span>
    </div>
  </div>`;
}

function doCommit() {
  const msg = q('gcin')?.value?.trim();
  if (!msg) { notify('Enter a commit message','warning'); return; }
  S.tabs.forEach(t=>t.dirty=false); renderTabs();
  notify(`Committed: "${msg}" on ${S.gitBranch}`,'success');
}

// ── Debug Panel ───────────────────────────────────────────────────────────
function debugHTML() {
  return `<div class="ph">Run and Debug <div class="pa">
    <button class="ib" onclick="runFile()" title="Start Debugging">${I.play}</button>
  </div></div>
  <div class="empty-state">
    <div style="font-size:36px">🐛</div>
    <div style="color:var(--tx);font-weight:600">Run & Debug</div>
    <div style="color:var(--mt);font-size:12px">No launch configuration found.</div>
    <button onclick="notify('Create launch.json')" style="margin-top:8px;padding:5px 14px;background:var(--btn);color:#fff;border-radius:3px;font-size:12px;cursor:pointer">Create launch.json</button>
    <button onclick="runFile()" style="margin-top:6px;padding:5px 14px;background:var(--btn);color:#fff;border-radius:3px;font-size:12px;cursor:pointer">▶ Run Active File (F5)</button>
  </div>`;
}

// ── Extensions Panel ──────────────────────────────────────────────────────
const EXTS = [
  {id:'python',name:'Python',pub:'Microsoft',ver:'2024.4',icon:'🐍',installed:true,desc:'IntelliSense, linting, debugging, formatting for Python'},
  {id:'prettier',name:'Prettier - Code formatter',pub:'Prettier',ver:'10.4.0',icon:'✨',installed:true,desc:'Opinionated code formatter supporting many languages'},
  {id:'eslint',name:'ESLint',pub:'Microsoft',ver:'3.0.5',icon:'🔍',installed:true,desc:'Integrates ESLint JavaScript linting into VS Code'},
  {id:'gitlens',name:'GitLens — Git supercharged',pub:'GitKraken',ver:'15.2',icon:'🔮',installed:false,desc:'Supercharge Git inside VS Code'},
  {id:'tailwind',name:'Tailwind CSS IntelliSense',pub:'Tailwind Labs',ver:'0.11.6',icon:'🌊',installed:false,desc:'Intelligent Tailwind CSS tooling'},
  {id:'rust',name:'rust-analyzer',pub:'The Rust Programming Language',ver:'0.3.2',icon:'🦀',installed:false,desc:'Rust language support with IntelliSense'},
  {id:'go',name:'Go',pub:'Go Team at Google',ver:'0.41.4',icon:'🔵',installed:false,desc:'Rich Go language support'},
  {id:'docker',name:'Docker',pub:'Microsoft',ver:'1.29.2',icon:'🐳',installed:false,desc:'Build, manage and deploy containerized applications'},
  {id:'copilot',name:'GitHub Copilot',pub:'GitHub',ver:'1.220',icon:'🤖',installed:false,desc:'Your AI pair programmer'},
  {id:'material',name:'Material Theme',pub:'Equinusocio',ver:'34.1.0',icon:'🎨',installed:false,desc:'The most epic theme for VS Code'},
  {id:'icons',name:'Material Icon Theme',pub:'PKief',ver:'5.3.0',icon:'📁',installed:false,desc:'Material Design icons for VS Code'},
  {id:'live',name:'Live Server',pub:'Ritwick Dey',ver:'5.7.9',icon:'🌐',installed:false,desc:'Launch a local development server with live reload'},
  {id:'vim',name:'Vim',pub:'vscodevim',ver:'1.27.2',icon:'📝',installed:false,desc:'Vim emulation for Visual Studio Code'},
  {id:'remote',name:'Remote - SSH',pub:'Microsoft',ver:'0.115',icon:'🖥',installed:false,desc:'Open any folder on a remote machine using SSH'},
  {id:'thunder',name:'Thunder Client',pub:'Thunder Client',ver:'2.28.5',icon:'⚡',installed:false,desc:'Lightweight Rest API Client for VS Code'},
];

function extHTML() {
  const q2 = S.extSearch.toLowerCase();
  const filtered = q2 ? EXTS.filter(e=>e.name.toLowerCase().includes(q2)||e.desc.toLowerCase().includes(q2)||e.pub.toLowerCase().includes(q2)) : EXTS;
  const ins = filtered.filter(e=>e.installed);
  const avail = filtered.filter(e=>!e.installed);
  return `<div class="ph">Extensions <div class="pa"></div></div>
  <div id="extpanel">
    <div id="extsw"><input id="extsin" placeholder="Search Extensions in Marketplace" value="${esc(S.extSearch)}" /></div>
    <div id="extlist">
      ${ins.length?`<div class="esec">— INSTALLED (${ins.length}) —</div>${ins.map(extCard).join('')}`:''}
      ${avail.length?`<div class="esec">— POPULAR (${avail.length}) —</div>${avail.map(extCard).join('')}`:''}
      ${filtered.length===0?'<div style="padding:16px;color:var(--mt);font-size:12px">No extensions match your search.</div>':''}
    </div>
  </div>`;
}

function extCard(e) {
  return `<div class="ecard">
    <div class="eic">${e.icon}</div>
    <div class="ein">
      <div class="enm">${esc(e.name)}</div>
      <div class="epb">${esc(e.pub)} • v${e.ver}</div>
      <div class="eds">${esc(e.desc)}</div>
    </div>
    <button class="eib${e.installed?' ins':''}" onclick="toggleExt(event,'${e.id}')">
      ${e.installed?'✓ Installed':'Install'}
    </button>
  </div>`;
}

function toggleExt(e, id) {
  e.stopPropagation();
  const ext = EXTS.find(x=>x.id===id);
  if (!ext || ext.installed) return;
  ext.installed = true;
  notify(`Installing: ${ext.name}…`,'info');
  setTimeout(()=>{ notify(`Installed: ${ext.name}`,'success'); renderSB(); }, 1000);
}


// ── AI Panel ──────────────────────────────────────────────────────────────
function aiHTML() {
  const msgs = S.aiMsgs.map(m => `
    <div class="amsg ${m.role}">
      <div class="av">${m.role==='user'?'U':'🤖'}</div>
      <div class="ab">
        <div class="rl">${m.role==='user'?'You':'AI Assistant'}</div>
        <div class="ac2">${fmtAI(m.content)}${m.streaming?'<span class="cblink"></span>':''}</div>
      </div>
    </div>`).join('');

  return `<div id="aichat">
    <div class="ph" style="border-bottom:1px solid var(--bdr)">
      <span style="display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:#7c3aed;display:inline-block"></span>
        AI Assistant
        ${S.aiStreaming?'<span style="font-size:11px;color:var(--mt)">(thinking…)</span>':''}
      </span>
      <div class="pa">
        <button class="ib" onclick="clearAI()" title="Clear chat">${I.trash}</button>
      </div>
    </div>
    ${!S.openaiKey?`<div style="padding:10px;background:rgba(255,150,0,.1);border:1px solid rgba(255,150,0,.3);margin:8px;border-radius:4px;font-size:12px;color:#dcdcaa">
      ⚠ Add OpenAI API key for real AI responses.
      <input type="password" placeholder="sk-proj-…" value="${esc(S.openaiKey)}"
        style="width:100%;margin-top:5px;background:var(--inp);border:1px solid var(--bdr);
        border-radius:3px;padding:4px 8px;color:var(--tx);font-size:12px;outline:none"
        onchange="setKey(this.value)" />
    </div>`:`<div style="padding:3px 12px 4px;font-size:11px;color:var(--mt);border-bottom:1px solid var(--bdr);flex-shrink:0">
      Model: gpt-4o &nbsp;•&nbsp; <span style="color:#7c3aed">●</span> Connected
    </div>`}
    <div id="aimsgs">
      ${msgs||`<div class="empty-state">
        <div style="font-size:40px">🤖</div>
        <div style="font-weight:600;color:var(--tx)">AI Assistant Ready</div>
        <div style="font-size:12px;color:var(--mt);margin-top:4px">
          Explain, generate, debug, refactor, test — right-click editor for AI actions.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:10px;width:100%">
          ${['Explain this file','Generate a React hook','Find bugs in my code','Add TypeScript types','Write unit tests','Optimize performance'].map(s=>
            `<button onclick="aiPrefill('${s}')" style="padding:5px 8px;background:var(--inp);border:1px solid var(--bdr);border-radius:3px;color:var(--mt);font-size:11px;cursor:pointer;text-align:left;transition:all .1s">${s}</button>`
          ).join('')}
        </div>
      </div>`}
    </div>
    <div id="aiinput">
      <div id="aiqbtns">
        <button class="aqb" onclick="aiQuick('explain')">💡 Explain</button>
        <button class="aqb" onclick="aiQuick('generate')">✨ Generate</button>
        <button class="aqb" onclick="aiQuick('debug')">🐛 Debug</button>
        <button class="aqb" onclick="aiQuick('refactor')">🔧 Refactor</button>
        <button class="aqb" onclick="aiQuick('test')">🧪 Tests</button>
        <button class="aqb" onclick="aiQuick('docs')">📚 Docs</button>
        <button class="aqb" onclick="aiQuick('convert')">🔄 Convert</button>
        <button class="aqb" onclick="aiQuick('review')">👁 Review</button>
      </div>
      <div id="airow">
        <textarea id="aita" rows="2" placeholder="Ask AI anything… (Enter to send, Shift+Enter for newline)"></textarea>
        <button id="aisend" onclick="aiSend()" title="Send (Enter)">${I.send}</button>
      </div>
    </div>
  </div>`;
}

function fmtAI(text) {
  if (!text) return '';
  // Code blocks with language
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const l = lang || 'code';
    return `<pre style="position:relative"><div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:#1a1a1a;border-bottom:1px solid var(--bdr);border-radius:4px 4px 0 0;margin:-10px -10px 8px">
      <span style="font-size:11px;color:var(--mt)">${esc(l)}</span>
      <button onclick="navigator.clipboard?.writeText(this.closest('pre').querySelector('code').textContent);notify('Copied','success')" style="font-size:11px;color:var(--ac);cursor:pointer;background:none;border:none">Copy</button>
    </div><code>${esc(code.trim())}</code></pre>`;
  });
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/^### (.+)$/gm, '<div style="font-weight:700;color:#dcdcaa;margin:6px 0 2px">$1</div>');
  text = text.replace(/^## (.+)$/gm, '<div style="font-weight:700;color:#c586c0;font-size:13px;margin:8px 0 2px">$1</div>');
  text = text.replace(/^# (.+)$/gm, '<div style="font-weight:700;color:#569cd6;font-size:14px;margin:8px 0 3px">$1</div>');
  text = text.replace(/^[-*] (.+)$/gm, '<div style="padding-left:12px">• $1</div>');
  text = text.replace(/^\d+\. (.+)$/gm, (m, c, o) => `<div style="padding-left:12px">${o} $1</div>`);
  text = text.replace(/\n/g, '<br>');
  return text;
}

function aiPrefill(txt) {
  const ta = q('aita');
  if (ta) { ta.value = txt; ta.focus(); }
}

function setKey(k) {
  S.openaiKey = k; localStorage.setItem('oai_key', k);
  if (k) { notify('API key saved','success'); renderSB(); }
}

function clearAI() { S.aiMsgs=[]; renderSB(); }

function aiQuick(action) {
  const t = S.tabs.find(t=>t.id===S.activeTab);
  const code = t?.content || '';
  const lang = t?.lang || 'code';
  const p = {
    explain: `Explain this ${lang} code in detail:\n\`\`\`${lang}\n${code}\n\`\`\``,
    generate: `I'm working in ${lang}. ${code ? 'Generate an improved version with best practices.' : 'Generate a useful utility function with full implementation.'}`,
    debug: `Find and fix all bugs in this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nList each issue and the fix.`,
    refactor: `Refactor this ${lang} code for better readability, performance, and best practices:\n\`\`\`${lang}\n${code}\n\`\`\``,
    test: `Write comprehensive unit tests (Jest/Vitest) for this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nInclude edge cases and error scenarios.`,
    docs: `Add comprehensive JSDoc/docstring documentation to every function:\n\`\`\`${lang}\n${code}\n\`\`\``,
    convert: `Convert this ${lang} code to TypeScript with proper types:\n\`\`\`${lang}\n${code}\n\`\`\``,
    review: `Perform a detailed code review of this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nCheck: quality, security, performance, and best practices.`,
  };
  aiSendMsg(p[action] || action);
}

function aiSend() {
  const ta = q('aita');
  const txt = ta?.value?.trim();
  if (!txt || S.aiStreaming) return;
  ta.value = '';
  aiSendMsg(txt);
}

async function aiSendMsg(text) {
  if (S.aiStreaming) return;
  const t = S.tabs.find(t=>t.id===S.activeTab);
  S.aiMsgs.push({role:'user', content:text});
  const aiMsg = {role:'ai', content:'', streaming:true};
  S.aiMsgs.push(aiMsg);
  S.aiStreaming = true;
  renderSB();

  // Build context
  const ctxNote = t ? `\n\nContext — active file: **${t.name}** (${t.lang})\n\`\`\`${t.lang}\n${t.content.slice(0,3000)}\n\`\`\`` : '';
  const sysPrompt = `You are an expert AI coding assistant integrated into a VS Code-style IDE. Provide clear, concise, production-ready responses with proper markdown formatting. Use \`\`\`language code blocks for all code. Be specific and actionable.${ctxNote}`;

  if (!S.openaiKey) {
    await simulateAI(aiMsg, text);
    return;
  }

  try {
    const messages = [
      {role:'system', content:sysPrompt},
      ...S.aiMsgs.slice(0,-1).map(m=>({role:m.role==='user'?'user':'assistant', content:m.content})),
      {role:'user', content:text}
    ];
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.openaiKey}`},
      body:JSON.stringify({model:'gpt-4o', stream:true, max_tokens:2048, temperature:0.7, messages})
    });
    if (!resp.ok) { const e=await resp.json(); throw new Error(e.error?.message||`HTTP ${resp.status}`); }
    const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf='';
    while(true) {
      const {done,value} = await reader.read(); if(done) break;
      buf += dec.decode(value,{stream:true});
      const lines = buf.split('\n'); buf = lines.pop()||'';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const d = line.slice(6).trim();
          if (d==='[DONE]') break;
          try { const p=JSON.parse(d); const chunk=p.choices?.[0]?.delta?.content||''; if(chunk){aiMsg.content+=chunk; patchLastAIMsg();} } catch{}
        }
      }
    }
  } catch(err) {
    aiMsg.content = `**Error:** ${err.message}\n\nCheck your API key in the input above.`;
  }
  aiMsg.streaming=false; S.aiStreaming=false; patchLastAIMsg();
}

async function simulateAI(aiMsg, prompt) {
  const t = S.tabs.find(t=>t.id===S.activeTab);
  const lang = t?.lang || 'typescript';
  const lp = prompt.toLowerCase();
  let resp;
  if (lp.includes('explain')) {
    resp = `## Code Explanation\n\nThis is **${lang}** code. Here's a breakdown:\n\n### What it does\nThe code ${t?'implements functionality in '+t.name:'performs various operations'}.\n\n### Key concepts\n- **Variables**: Properly scoped and typed\n- **Functions**: Follow single responsibility\n- **Logic**: Clean conditional flow\n\n### Suggestions\n1. Add error handling for edge cases\n2. Consider adding TypeScript types\n3. Add JSDoc comments for documentation\n\n> *Add your OpenAI API key for real AI analysis.*`;
  } else if (lp.includes('generat')) {
    resp = `## Generated Code\n\nHere's a utility function for your project:\n\n\`\`\`${lang}\n/**\n * Fetches data with error handling and retry logic\n * @param url - The endpoint URL\n * @param options - Fetch options\n * @returns Promise with typed response\n */\nasync function fetchWithRetry<T>(\n  url: string,\n  options: RequestInit = {},\n  retries = 3\n): Promise<T> {\n  for (let i = 0; i < retries; i++) {\n    try {\n      const response = await fetch(url, {\n        ...options,\n        headers: {\n          'Content-Type': 'application/json',\n          ...options.headers,\n        },\n      });\n      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);\n      return response.json() as T;\n    } catch (error) {\n      if (i === retries - 1) throw error;\n      await new Promise(r => setTimeout(r, 1000 * (i + 1)));\n    }\n  }\n  throw new Error('Max retries exceeded');\n}\n\`\`\`\n\n> *Add your OpenAI API key for custom code generation.*`;
  } else if (lp.includes('debug')||lp.includes('fix')||lp.includes('bug')) {
    resp = `## Code Analysis\n\nReviewing your ${lang} code for issues:\n\n### Potential Issues Found\n1. **Missing error handling** — Wrap async operations in try/catch\n2. **Null checks** — Add guards before accessing object properties\n3. **Type safety** — Consider strict TypeScript types\n\n### Fixed Code Pattern\n\`\`\`${lang}\n// Before (potentially unsafe)\nconst data = response.data.items;\n\n// After (safe with null checks)\nconst data = response?.data?.items ?? [];\n\`\`\`\n\n> *Add your OpenAI API key for real bug detection.*`;
  } else if (lp.includes('refactor')) {
    resp = `## Refactoring Suggestions\n\nHere are improvements for your ${lang} code:\n\n### Changes Made\n1. **Extract functions** — Break large functions into smaller ones\n2. **Constants** — Move magic numbers to named constants\n3. **Early returns** — Reduce nesting with guard clauses\n\n\`\`\`${lang}\n// Refactored with early returns and constants\nconst MAX_RETRIES = 3;\nconst TIMEOUT_MS = 5000;\n\nfunction processData(input: unknown): Result {\n  if (!input) return { success: false, error: 'No input' };\n  if (!isValid(input)) return { success: false, error: 'Invalid input' };\n  \n  return { success: true, data: transform(input) };\n}\n\`\`\`\n\n> *Add your OpenAI API key for real refactoring.*`;
  } else {
    resp = `## AI Assistant\n\nI'm your intelligent coding assistant! I can help you:\n\n- 💡 **Explain** any code or concept\n- ✨ **Generate** functions, components, and utilities\n- 🐛 **Debug** and fix errors\n- 🔧 **Refactor** for better quality\n- 🧪 **Write tests** with full coverage\n- 📚 **Add documentation** and JSDoc\n- 🔄 **Convert** between languages\n- 👁 **Review** for security and performance\n\n### Quick Start\nRight-click in the editor to see AI actions, or use the buttons above.\n\n### Enable Real AI\nAdd your **OpenAI API key** above to enable GPT-4o responses.\nYour key is stored locally and only sent to OpenAI's API.\n\n**You asked:** *${esc(prompt)}*`;
  }
  // Stream character by character
  for (const ch of resp) {
    aiMsg.content += ch; patchLastAIMsg();
    await new Promise(r => setTimeout(r, 6));
  }
  aiMsg.streaming=false; S.aiStreaming=false; patchLastAIMsg();
}

function patchLastAIMsg() {
  const msgs = q('aimsgs');
  if (!msgs) return;
  const last = S.aiMsgs[S.aiMsgs.length-1];
  if (!last) return;
  const els = msgs.querySelectorAll('.amsg');
  const lastEl = els[els.length-1];
  if (lastEl) {
    lastEl.querySelector('.ac2').innerHTML = fmtAI(last.content) + (last.streaming?'<span class="cblink"></span>':'');
    msgs.scrollTop = msgs.scrollHeight;
  } else renderSB();
}


// ── Context Menu ──────────────────────────────────────────────────────────
function showCtx(x, y, items) {
  const m = q('ctxmenu');
  m.innerHTML = items.map((it,i) => it.sep
    ? '<div class="cms"></div>'
    : `<div class="cmi" data-i="${i}">${esc(it.lbl)}</div>`
  ).join('');
  let ri = 0;
  m.querySelectorAll('.cmi').forEach(el => {
    const valid = items.filter(x=>!x.sep);
    const item = valid[ri++];
    if (item) el.addEventListener('click', ()=>{closeCtx(); item.fn?.();});
  });
  const maxX = window.innerWidth - 200, maxY = window.innerHeight - 200;
  m.style.left = Math.min(x, maxX)+'px';
  m.style.top = Math.min(y, maxY)+'px';
  m.classList.add('sh');
}
function closeCtx() { q('ctxmenu').classList.remove('sh'); }

// ── Command Palette ───────────────────────────────────────────────────────
const CMD_ITEMS = [
  {ic:'📄', lbl:'New File', cat:'File', fn:newFile},
  {ic:'📂', lbl:'Open File…', cat:'File', fn:openFile},
  {ic:'📁', lbl:'Open Folder…', cat:'File', fn:openFolder},
  {ic:'💾', lbl:'Save File', cat:'File', fn:saveActive},
  {ic:'💾', lbl:'Save As…', cat:'File', fn:saveAs},
  {ic:'💾', lbl:'Save All', cat:'File', fn:saveAll},
  {ic:'✕', lbl:'Close Editor', cat:'File', fn:closeActiveTab},
  {ic:'✕', lbl:'Close All Editors', cat:'File', fn:closeAllTabs},
  {ic:'🔍', lbl:'Find in File', cat:'Edit', fn:()=>mcmd('actions.find')},
  {ic:'🔄', lbl:'Replace in File', cat:'Edit', fn:()=>mcmd('editor.action.startFindReplaceAction')},
  {ic:'🔍', lbl:'Find in Files', cat:'Edit', fn:()=>switchP('search')},
  {ic:'🎨', lbl:'Format Document', cat:'Edit', fn:()=>mcmd('editor.action.formatDocument')},
  {ic:'💬', lbl:'Toggle Comment', cat:'Edit', fn:()=>mcmd('editor.action.commentLine')},
  {ic:'📁', lbl:'View: Show Explorer', cat:'View', fn:()=>switchP('explorer')},
  {ic:'🔍', lbl:'View: Show Search', cat:'View', fn:()=>switchP('search')},
  {ic:'⎇', lbl:'View: Show Source Control', cat:'View', fn:()=>switchP('git')},
  {ic:'🐛', lbl:'View: Show Run and Debug', cat:'View', fn:()=>switchP('debug')},
  {ic:'🧩', lbl:'View: Show Extensions', cat:'View', fn:()=>switchP('extensions')},
  {ic:'🤖', lbl:'View: Show AI Assistant', cat:'View', fn:()=>switchP('ai')},
  {ic:'⊟', lbl:'View: Toggle Sidebar', cat:'View', fn:toggleSB},
  {ic:'⊡', lbl:'View: Toggle Terminal', cat:'View', fn:toggleBP},
  {ic:'🔡', lbl:'View: Toggle Word Wrap', cat:'Editor', fn:toggleWW},
  {ic:'🗺', lbl:'View: Toggle Minimap', cat:'Editor', fn:toggleMM},
  {ic:'🔎', lbl:'View: Zoom In', cat:'Editor', fn:()=>changeFS(1)},
  {ic:'🔍', lbl:'View: Zoom Out', cat:'Editor', fn:()=>changeFS(-1)},
  {ic:'💻', lbl:'Terminal: New Terminal', cat:'Terminal', fn:newTerm},
  {ic:'🗑', lbl:'Terminal: Clear Terminal', cat:'Terminal', fn:clearTerm},
  {ic:'▶', lbl:'Run: Run Active File', cat:'Run', fn:runFile},
  {ic:'💡', lbl:'AI: Explain Code', cat:'AI', fn:()=>aiQuick('explain')},
  {ic:'✨', lbl:'AI: Generate Code', cat:'AI', fn:()=>aiQuick('generate')},
  {ic:'🐛', lbl:'AI: Debug / Fix Code', cat:'AI', fn:()=>aiQuick('debug')},
  {ic:'🔧', lbl:'AI: Refactor Code', cat:'AI', fn:()=>aiQuick('refactor')},
  {ic:'🧪', lbl:'AI: Generate Tests', cat:'AI', fn:()=>aiQuick('test')},
  {ic:'📚', lbl:'AI: Generate Documentation', cat:'AI', fn:()=>aiQuick('docs')},
  {ic:'🔄', lbl:'AI: Convert to TypeScript', cat:'AI', fn:()=>aiQuick('convert')},
  {ic:'👁', lbl:'AI: Code Review', cat:'AI', fn:()=>aiQuick('review')},
];

let _cmdIdx = 0;
function openCmd() {
  q('cmdpal').classList.add('sh');
  const inp = q('cmdin'); inp.value=''; inp.focus();
  filterCmd('');
}
function closeCmd() { q('cmdpal').classList.remove('sh'); }
function filterCmd(txt) {
  _cmdIdx=0;
  const lo = txt.toLowerCase();
  const fileCmds = flatFiles(S.fileTree).map(f=>({ic:fileIcon(f.name), lbl:f.name, cat:'Files', extra:f.path||f.name, fn:()=>openTabFor(f)}));
  const all = [...CMD_ITEMS, ...fileCmds];
  const list = txt ? all.filter(c=>c.lbl.toLowerCase().includes(lo)||c.cat.toLowerCase().includes(lo)) : CMD_ITEMS.slice(0,18);
  const res = q('cmdres');
  res.innerHTML = list.slice(0,22).map((c,i)=>`
    <div class="cr${i===0?' crs':''}" data-i="${i}" onclick="pickCmd(${i})">
      <span class="cric">${c.ic}</span>
      <div class="crl">
        <div>${esc(c.lbl)}</div>
        ${c.extra?`<div style="font-size:11px;color:var(--mt)">${esc(c.extra)}</div>`:''}
      </div>
      <span class="crcat">${c.cat}</span>
    </div>`).join('');
  res._list = list.slice(0,22);
}
function cmdKey(e) {
  const res = q('cmdres'); const els = res?.querySelectorAll('.cr');
  if (!els?.length) return;
  if (e.key==='ArrowDown'){e.preventDefault();_cmdIdx=Math.min(_cmdIdx+1,els.length-1);updCmdSel(els);}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdIdx=Math.max(_cmdIdx-1,0);updCmdSel(els);}
  else if(e.key==='Enter'){e.preventDefault();closeCmd();res._list[_cmdIdx]?.fn?.();}
  else if(e.key==='Escape')closeCmd();
}
function updCmdSel(els){els.forEach((e,i)=>e.classList.toggle('crs',i===_cmdIdx));els[_cmdIdx]?.scrollIntoView({block:'nearest'});}
function pickCmd(i){closeCmd();q('cmdres')._list?.[i]?.fn?.();}

// ── Modal ─────────────────────────────────────────────────────────────────
let _modCb = null;
function showModal(title, label, def, cb) {
  _modCb = cb;
  q('modlbl').textContent = label;
  const inp = q('modin'); inp.value=def||'';
  q('modover').classList.add('sh');
  setTimeout(()=>{inp.select();inp.focus();},60);
}
function modClose(){q('modover').classList.remove('sh');_modCb=null;}
function modOK(){const v=q('modin').value;modClose();_modCb?.(v);}

// ── Notifications ─────────────────────────────────────────────────────────
function notify(msg, type='info') {
  const icons = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'};
  const id=uid();
  const d=document.createElement('div');
  d.className=`notif ${type}`; d.id=id;
  d.innerHTML=`<span class="nfi">${icons[type]}</span><span class="nmsg">${esc(msg)}</span><button class="nclose" onclick="document.getElementById('${id}')?.remove()">✕</button>`;
  q('notifarea').appendChild(d);
  setTimeout(()=>document.getElementById(id)?.remove(),3000);
}

// ── Settings ──────────────────────────────────────────────────────────────
function showSettings() {
  const size = prompt(`Font size (current: ${S.fontSize}):`, S.fontSize);
  if (size && !isNaN(size)) changeFS(parseInt(size)-S.fontSize);
}

// ── Resize handles ────────────────────────────────────────────────────────
function initResize() {
  const sb=q('sidebar'), sr=q('sbresize');
  let drag=false,sx=0,sw=0;
  sr.addEventListener('mousedown',e=>{drag=true;sx=e.clientX;sw=sb.offsetWidth;sr.classList.add('drag');document.body.style.cursor='col-resize';e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!drag)return;const w=Math.max(150,Math.min(600,sw+(e.clientX-sx)));sb.style.width=w+'px';});
  document.addEventListener('mouseup',()=>{drag=false;sr.classList.remove('drag');document.body.style.cursor='';});

  const bp=q('bottompanel'),br=q('bresize');
  let bDrag=false,by=0,bh=0;
  br.addEventListener('mousedown',e=>{bDrag=true;by=e.clientY;bh=bp.offsetHeight;br.classList.add('drag');document.body.style.cursor='row-resize';e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!bDrag)return;const h=Math.max(80,Math.min(600,bh-(e.clientY-by)));bp.style.height=h+'px';});
  document.addEventListener('mouseup',()=>{bDrag=false;br.classList.remove('drag');document.body.style.cursor='';});
}

// ── Global keyboard ───────────────────────────────────────────────────────
function initKeys() {
  document.addEventListener('keydown', e => {
    const c=e.ctrlKey||e.metaKey;
    if(c&&e.shiftKey&&e.key==='P'){e.preventDefault();openCmd();}
    else if(c&&e.shiftKey&&e.key==='E'){e.preventDefault();switchP('explorer');}
    else if(c&&e.shiftKey&&e.key==='F'){e.preventDefault();switchP('search');}
    else if(c&&e.shiftKey&&e.key==='G'){e.preventDefault();switchP('git');}
    else if(c&&e.shiftKey&&e.key==='D'){e.preventDefault();switchP('debug');}
    else if(c&&e.shiftKey&&e.key==='X'){e.preventDefault();switchP('extensions');}
    else if(c&&e.shiftKey&&e.key==='A'){e.preventDefault();switchP('ai');}
    else if(c&&e.key==='b'){e.preventDefault();toggleSB();}
    else if(c&&e.key==='`'){e.preventDefault();toggleBP();}
    else if(c&&e.key==='n'){e.preventDefault();newFile();}
    else if(c&&e.key==='o'){e.preventDefault();openFile();}
    else if(c&&e.key==='w'){e.preventDefault();closeActiveTab();}
    else if(c&&e.key==='s'&&!e.shiftKey){e.preventDefault();saveActive();}
    else if(c&&e.key==='S'&&e.shiftKey){e.preventDefault();saveAs();}
    else if(c&&e.key===','){e.preventDefault();showSettings();}
    else if(c&&e.key==='p'&&!e.shiftKey){e.preventDefault();openCmd();}
    else if(e.key==='Escape'){closeCmd();closeCtx();closeMenus();modClose();}
    else if(e.key==='F5'){e.preventDefault();runFile();}
  });
  document.addEventListener('click', ()=>{closeMenus();closeCtx();});
}

// ── Default file content ──────────────────────────────────────────────────
function defContent(name, lang) {
  const base = name.replace(/\.[^.]+$/, '');
  const t = {
    typescript:`// ${name}\n\ninterface Config {\n  name: string;\n  value: number;\n  enabled: boolean;\n}\n\nfunction initialize(config: Config): void {\n  console.log(\`Initializing \${config.name}...\`);\n  if (!config.enabled) return;\n  console.log(\`Value: \${config.value}\`);\n}\n\nexport { Config, initialize };\n`,
    javascript:`// ${name}\n\n'use strict';\n\nfunction main() {\n  console.log('Hello from ${base}!');\n}\n\nmodule.exports = { main };\n`,
    python:`# ${name}\n"""${base} module."""\n\nfrom typing import Optional, List, Dict\n\n\ndef main() -> None:\n    """Main entry point."""\n    print(f"Hello from ${base}!")\n\n\nif __name__ == "__main__":\n    main()\n`,
    html:`<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${base}</title>\n  <style>\n    * { box-sizing: border-box; margin: 0; padding: 0; }\n    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }\n    h1 { color: #007acc; margin-bottom: 16px; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <h1>${base}</h1>\n    <p>Hello, World!</p>\n  </div>\n  <script>\n    document.addEventListener('DOMContentLoaded', () => {\n      console.log('${base} loaded');\n    });\n  </script>\n</body>\n</html>\n`,
    css:`/* ${name} */\n\n:root {\n  --primary: #007acc;\n  --secondary: #6c757d;\n  --bg: #ffffff;\n  --text: #333333;\n  --border: #dee2e6;\n}\n\n*, *::before, *::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;\n  font-size: 16px;\n  line-height: 1.5;\n  color: var(--text);\n  background: var(--bg);\n}\n`,
    json:`{\n  "$schema": "https://json-schema.org/draft-07/schema",\n  "name": "${base}",\n  "version": "1.0.0",\n  "description": "A new project",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "dev": "nodemon index.js",\n    "test": "jest",\n    "build": "tsc"\n  },\n  "keywords": [],\n  "author": "",\n  "license": "MIT",\n  "dependencies": {},\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "@types/node": "^20.0.0"\n  }\n}\n`,
    markdown:`# ${base}\n\n> A brief description of this project.\n\n## Features\n\n- ✅ Feature one\n- ✅ Feature two\n- 🚧 Feature in progress\n\n## Getting Started\n\n### Prerequisites\n\n\`\`\`bash\nnode -v  # v20+\nnpm -v   # v10+\n\`\`\`\n\n### Installation\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Usage\n\n\`\`\`javascript\nimport { init } from './${base}';\ninit({ debug: true });\n\`\`\`\n\n## License\n\nMIT © ${new Date().getFullYear()}\n`,
    rust:`// ${name}\n\nuse std::fmt;\n\n#[derive(Debug, Clone)]\nstruct Config {\n    name: String,\n    value: i32,\n}\n\nimpl fmt::Display for Config {\n    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {\n        write!(f, "Config {{ name: {}, value: {} }}", self.name, self.value)\n    }\n}\n\nfn main() {\n    let config = Config {\n        name: String::from("${base}"),\n        value: 42,\n    };\n    println!("Hello from {}!", config);\n}\n`,
    go:`package main\n\nimport (\n\t"fmt"\n\t"log"\n)\n\ntype Config struct {\n\tName  string\n\tValue int\n}\n\nfunc NewConfig(name string, value int) *Config {\n\treturn &Config{Name: name, Value: value}\n}\n\nfunc main() {\n\tconfig := NewConfig("${base}", 42)\n\tfmt.Printf("Hello from %s!\\n", config.Name)\n\tlog.Printf("Config: %+v\\n", config)\n}\n`,
    java:`// ${name}\n\nimport java.util.logging.Logger;\n\npublic class ${base.charAt(0).toUpperCase()+base.slice(1).replace(/[^a-zA-Z0-9]/g,'_')} {\n    private static final Logger logger = Logger.getLogger(${base.charAt(0).toUpperCase()+base.slice(1)}.class.getName());\n\n    public static void main(String[] args) {\n        logger.info("Starting ${base}...");\n        System.out.println("Hello from ${base}!");\n    }\n}\n`,
    cpp:`// ${name}\n#include <iostream>\n#include <string>\n#include <vector>\n\nnamespace ${base.replace(/[^a-zA-Z0-9]/g,'_')} {\n\nstruct Config {\n    std::string name;\n    int value;\n    bool enabled;\n};\n\nvoid initialize(const Config& config) {\n    if (!config.enabled) return;\n    std::cout << "Hello from " << config.name << "!" << std::endl;\n}\n\n} // namespace\n\nint main() {\n    ${base.replace(/[^a-zA-Z0-9]/g,'_')}::Config cfg{"${base}", 42, true};\n    ${base.replace(/[^a-zA-Z0-9]/g,'_')}::initialize(cfg);\n    return 0;\n}\n`,
    shell:`#!/bin/bash\n# ${name}\n# Description: ${base} script\n\nset -euo pipefail\n\nLOG_FILE="/tmp/${base}.log"\n\nlog() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "\$LOG_FILE"; }\nerr() { log "ERROR: $*" >&2; exit 1; }\n\nmain() {\n    log "Starting ${base}..."\n    echo "Hello from ${base}!"\n    log "Done."\n}\n\nmain "$@"\n`,
    sql:`-- ${name}\n-- Created: ${new Date().toISOString().split('T')[0]}\n\n-- Create table\nCREATE TABLE IF NOT EXISTS ${base.replace(/[^a-zA-Z0-9]/g,'_')} (\n    id          SERIAL PRIMARY KEY,\n    name        VARCHAR(255) NOT NULL,\n    value       INTEGER DEFAULT 0,\n    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\n-- Create index\nCREATE INDEX IF NOT EXISTS idx_${base.replace(/[^a-zA-Z0-9]/g,'_')}_name ON ${base.replace(/[^a-zA-Z0-9]/g,'_')}(name);\n\n-- Insert sample data\nINSERT INTO ${base.replace(/[^a-zA-Z0-9]/g,'_')} (name, value) VALUES\n    ('Sample A', 100),\n    ('Sample B', 200);\n\n-- Query\nSELECT * FROM ${base.replace(/[^a-zA-Z0-9]/g,'_')} ORDER BY created_at DESC;\n`,
  };
  return t[lang] || `// ${name}\n`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
function boot() {
  injectCSS();
  buildHTML();
  buildMenus();
  renderSB();
  renderTabs();
  // Init bottom panel
  setTimeout(() => { renderBP(); q('termin')?.focus(); }, 100);
  initResize();
  initKeys();
  // Drag & drop on whole window
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const files = [...(e.dataTransfer.files||[])];
    if (!files.length) return;
    files.forEach(f => {
      const r = new FileReader();
      const ext=f.name.split('.').pop().toLowerCase();
      const bin=['png','jpg','jpeg','gif','pdf','zip','exe'];
      if (bin.includes(ext)){ S.fileTree.push({id:uid(),name:f.name,type:'file',content:'[Binary]',path:f.name}); if(S.panel==='explorer')renderSB(); return; }
      r.onload=ev=>{const n={id:uid(),name:f.name,type:'file',content:ev.target.result,path:f.name};S.fileTree.push(n);if(S.panel==='explorer')renderSB();openTabFor(n);};
      r.readAsText(f);
    });
    notify(`Dropped ${files.length} file(s)`,'success');
  });
}

window.addEventListener('DOMContentLoaded', boot);

// Expose all functions to global scope for onclick handlers
Object.assign(window, {
  switchP, toggleSB, toggleBP, openCmd, closeCmd, filterCmd, cmdKey, pickCmd,
  openFile, openFolder, onFileIn, onFolderIn,
  tnClick, tnDbl, tnCtx, collapseAll, newFile, newFileDlg, newFolderDlg,
  newFileUnder, newFolderUnder, renameNode, deleteNode,
  activateTab, closeTab, closeActiveTab, closeAllTabs, tabCtx,
  switchBP, newTerm, clearTerm, termKey, runFile,
  saveActive, saveAs, saveAll, showSettings, toggleWW, toggleMM, changeFS,
  doSearch, doReplaceAll, jumpToMatch,
  doCommit, toggleExt,
  aiSend, aiQuick, aiPrefill, setKey, clearAI,
  showCtx, closeCtx, showModal, modClose, modOK, notify,
  mcmd,
});
