import { CheckCircle2, FileWarning, ShieldCheck, X } from 'lucide-react';

interface CopyrightSafetyDialogProps {
  onClose: () => void;
}

const allowedItems = [
  'Your own source code, docs, notes, and project assets',
  'Open-source content you are allowed to use under its license',
  'Short excerpts used for review, debugging, citation, or transformation',
  'Original AI prompts, tests, comments, and implementation plans',
];

const restrictedItems = [
  'Full books, paid articles, lyrics, scripts, courses, or private docs you do not own',
  'Large copied sections from websites, documentation, or another product',
  'Requests to reproduce copyrighted UI, branding, datasets, or proprietary code',
  'Content that removes attribution, license text, watermarks, or ownership notices',
];

export default function CopyrightSafetyDialog({ onClose }: CopyrightSafetyDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <section
        className="w-full max-w-[680px] overflow-hidden rounded-lg border shadow-2xl"
        style={{
          background: '#15191d',
          borderColor: 'rgba(125,211,252,0.26)',
          color: 'var(--color-text)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copyright-safety-title"
      >
        <header
          className="flex items-start justify-between gap-4 border-b px-5 py-4"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md"
              style={{ background: 'rgba(71,214,182,0.14)', color: '#8df0d9' }}
            >
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <h2 id="copyright-safety-title" className="text-[17px] font-semibold leading-6">
                Copyright-safe workspace
              </h2>
              <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--color-textMuted)' }}>
                Use this IDE for original work, permitted code, and small contextual excerpts. Do not paste or generate content that copies protected material you do not have rights to use.
              </p>
            </div>
          </div>
          <button
            title="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-textMuted)' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <PolicyPanel
            icon={CheckCircle2}
            title="Allowed"
            items={allowedItems}
            color="#47d6b6"
            background="rgba(71,214,182,0.08)"
            border="rgba(71,214,182,0.24)"
          />
          <PolicyPanel
            icon={FileWarning}
            title="Do not add"
            items={restrictedItems}
            color="#fbbf24"
            background="rgba(251,191,36,0.08)"
            border="rgba(251,191,36,0.24)"
          />
        </div>

        <footer
          className="border-t px-5 py-4 text-[12px] leading-5"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--color-textMuted)' }}
        >
          When unsure, use a summary in your own words, link to the source, or keep the excerpt brief and necessary for the task.
        </footer>
      </section>
    </div>
  );
}

function PolicyPanel({
  icon: Icon,
  title,
  items,
  color,
  background,
  border,
}: {
  icon: typeof ShieldCheck;
  title: string;
  items: string[];
  color: string;
  background: string;
  border: string;
}) {
  return (
    <div className="rounded-md border p-4" style={{ background, borderColor: border }}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[12px] leading-5" style={{ color: 'var(--color-text)' }}>
            <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
