import { Plus, Trash2 } from "lucide-react";
import type { Task, ScheduleType } from "../../types";
import { categoryMeta, defaultTypeKey } from "../../lib/schedule";
import { useCategories } from "../../hooks/useCategories";

interface Props {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

// 과제 추가/수정/삭제 편집기 (일정처럼 시간 + 종류 드롭박스 + 제목).
export default function TaskEditor({ tasks, onChange }: Props) {
  const categories = useCategories("task");

  function update(index: number, patch: Partial<Task>) {
    onChange(tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTask() {
    onChange([
      ...tasks,
      { time: "18:00", title: "", type: defaultTypeKey(categories) },
    ]);
  }

  function removeTask(index: number) {
    onChange(tasks.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.length === 0 && (
        <p className="text-slate-400 text-center py-4">
          아직 과제가 없습니다. 아래 버튼으로 추가하세요.
        </p>
      )}

      {tasks.map((t, i) => {
        const meta = categoryMeta(categories, t.type);
        return (
          <div key={i} className={`rounded-2xl border p-4 ${meta.card}`}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={t.time}
                onChange={(e) => update(i, { time: e.target.value })}
                className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
              <select
                value={t.type}
                onChange={(e) =>
                  update(i, { type: e.target.value as ScheduleType })
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeTask(i)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold text-rose-500 transition hover:bg-rose-50"
              >
                <Trash2 size={17} strokeWidth={2.4} />
                삭제
              </button>
            </div>

            <input
              type="text"
              value={t.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="과제 이름 (예: 수학 문제집 5쪽)"
              className="w-full mt-3 rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={addTask}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50"
      >
        <Plus size={18} strokeWidth={2.6} />
        과제 추가
      </button>
    </div>
  );
}
