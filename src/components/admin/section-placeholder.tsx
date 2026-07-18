import { getSection } from "@/lib/admin-sections";

// Página-esqueleto para seções ainda não implementadas.
export function SectionPlaceholder({ sectionKey }: { sectionKey: string }) {
  const section = getSection(sectionKey);
  if (!section) return null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-2xl">{section.icon}</span>
        <h2 className="text-xl font-bold">{section.label}</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Em desenvolvimento
        </span>
      </div>
      <p className="max-w-xl text-sm text-slate-600">{section.description}</p>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Esta seção será desenvolvida em breve.
      </div>
    </div>
  );
}
