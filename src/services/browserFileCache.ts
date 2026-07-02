const browserFiles = new Map<string, File>();

export const browserFileCache = {
  register(path: string, file: File) {
    browserFiles.set(normalizePath(path), file);
  },

  registerMany(entries: Array<{ path: string; file: File }>) {
    entries.forEach(({ path, file }) => browserFiles.set(normalizePath(path), file));
  },

  async read(path: string) {
    const file = browserFiles.get(normalizePath(path));
    return file ? file.text() : null;
  },

  clear() {
    browserFiles.clear();
  },
};

function normalizePath(path: string) {
  return path.replace(/\\/g, '/');
}
