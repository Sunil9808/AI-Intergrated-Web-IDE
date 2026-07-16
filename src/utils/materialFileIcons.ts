const ICON_CDN = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@main/icons';

const NAMED_FILE_ICONS: Record<string, string> = {
  '.env': 'tune',
  '.env.local': 'tune',
  '.env.development': 'tune',
  '.env.production': 'tune',
  '.env.example': 'tune',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  '.eslintrc': 'eslint',
  '.eslintrc.json': 'eslint',
  '.eslintrc.js': 'eslint',
  '.prettierrc': 'prettier',
  '.prettierrc.json': 'prettier',
  dockerfile: 'docker',
  makefile: 'makefile',
  'package.json': 'npm',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'tsconfig.json': 'tsconfig',
  'jsconfig.json': 'jsconfig',
  'vite.config.ts': 'vite',
  'vite.config.js': 'vite',
  'vite.config.mjs': 'vite',
  'tailwind.config.js': 'tailwindcss',
  'tailwind.config.ts': 'tailwindcss',
  'webpack.config.js': 'webpack',
  'rollup.config.js': 'rollup',
  'readme.md': 'readme',
  'license': 'certificate',
  'license.md': 'certificate',
  'license.txt': 'certificate',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker',
  '.dockerignore': 'docker',
  'index.html': 'html',
  'cargo.toml': 'rust',
  'go.mod': 'go-mod',
  'requirements.txt': 'python-misc',
  'pyproject.toml': 'python-misc',
  'postcss.config.js': 'postcss',
  'postcss.config.cjs': 'postcss',
  'postcss.config.mjs': 'postcss',
};

const EXTENSION_ICONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'react_ts',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'react',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  pyw: 'python',
  ipynb: 'notebook',
  java: 'java',
  class: 'java',
  jar: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'svg',
  md: 'markdown',
  mdx: 'mdx',
  sh: 'console',
  bash: 'console',
  zsh: 'console',
  fish: 'console',
  ps1: 'powershell',
  psm1: 'powershell',
  sql: 'database',
  sqlite: 'database',
  toml: 'toml',
  ini: 'settings',
  env: 'tune',
  txt: 'document',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  ico: 'image',
  zip: 'zip',
  tar: 'zip',
  gz: 'zip',
  rar: 'zip',
  '7z': 'zip',
  vue: 'vue',
  svelte: 'svelte',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  cljs: 'clojure',
  hs: 'haskell',
  tf: 'terraform',
  proto: 'proto',
  graphql: 'graphql',
  gql: 'graphql',
  prisma: 'prisma',
  lock: 'lock',
  wasm: 'webassembly',
  dockerfile: 'docker',
};

export function getMaterialIconName(filename: string, isDirectory = false, isOpen = false): string {
  if (isDirectory) return isOpen ? 'folder-open' : 'folder';

  const lower = filename.toLowerCase();
  if (NAMED_FILE_ICONS[lower]) return NAMED_FILE_ICONS[lower];

  const baseName = lower.split('/').pop() || lower;
  if (NAMED_FILE_ICONS[baseName]) return NAMED_FILE_ICONS[baseName];

  if (baseName.startsWith('.eslintrc')) return 'eslint';
  if (baseName.startsWith('.prettierrc')) return 'prettier';
  if (baseName === 'dockerfile' || baseName.endsWith('.dockerfile')) return 'docker';

  const ext = baseName.split('.').pop() || '';
  return EXTENSION_ICONS[ext] || 'file';
}

export function getMaterialIconUrl(filename: string, isDirectory = false, isOpen = false): string {
  const iconName = getMaterialIconName(filename, isDirectory, isOpen);
  return `${ICON_CDN}/${iconName}.svg`;
}

export function getFallbackIconMeta(filename: string, isDirectory = false) {
  if (isDirectory) {
    return { label: '', color: '#dcb67a', background: 'transparent' };
  }

  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop() || '';
  const named: Record<string, { label: string; color: string }> = {
    '.env': { label: '', color: '#8a8a8a' },
    '.gitignore': { label: '', color: '#6f8792' },
    'docker-compose.yml': { label: '', color: '#ff5fa8' },
    'docker-compose.yaml': { label: '', color: '#ff5fa8' },
    'package.json': { label: '{}', color: '#dcdc52' },
    'package-lock.json': { label: '{}', color: '#dcdc52' },
    'tsconfig.json': { label: 'TS', color: '#56b6c2' },
    'tsconfig.node.json': { label: '{}', color: '#dcdc52' },
    'readme.md': { label: 'i', color: '#4fc1ff' },
  };
  const byExtension: Record<string, { label: string; color: string }> = {
    js: { label: 'JS', color: '#dcdc52' },
    jsx: { label: 'JSX', color: '#61dafb' },
    ts: { label: 'TS', color: '#4fc1ff' },
    tsx: { label: 'TSX', color: '#4fc1ff' },
    html: { label: '<>', color: '#ff7b3a' },
    css: { label: '#', color: '#42a5f5' },
    scss: { label: 'S', color: '#cf649a' },
    json: { label: '{}', color: '#dcdc52' },
    yml: { label: 'Y', color: '#cbcb41' },
    yaml: { label: 'Y', color: '#cbcb41' },
    md: { label: 'i', color: '#4fc1ff' },
    py: { label: 'PY', color: '#4b8bbe' },
    java: { label: 'J', color: '#f89820' },
    env: { label: '', color: '#8a8a8a' },
  };

  return named[lower] || byExtension[ext] || { label: '', color: '#c5c5c5' };
}
