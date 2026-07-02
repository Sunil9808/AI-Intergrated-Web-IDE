export default function OutputPanel() {
  return (
    <div className="h-full p-3 font-mono text-xs overflow-y-auto" style={{ color: 'var(--color-text)', background: '#1e1e1e' }}>
      <div style={{ color: '#858585' }}>[Output] AI Web IDE initialized</div>
      <div style={{ color: '#4ec9b0' }}>[Info] Server connected at http://localhost:5000</div>
      <div style={{ color: '#858585' }}>[Info] Monaco Editor ready</div>
      <div style={{ color: '#4ec9b0' }}>[Info] AI service ready</div>
    </div>
  );
}
