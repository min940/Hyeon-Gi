import type { Task } from "../../types";

interface Props {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

// 과제 추가/수정/삭제 편집기. (날짜 편집에서 사용)
export default function TaskEditor({ tasks, onChange }: Props) {
  function update(index: number, title: string) {
    onChange(tasks.map((t, i) => (i === index ? { ...t, title } : t)));
  }

  function addTask() {
    onChange([...tasks, { title: "" }]);
  }

  function removeTask(index: number) {
    onChange(tasks.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.length === 0 && (
        <p className="text-slate-400 text-center py-4">
          아직 과제가 없습니다. 아래 버튼으로 추가하세요.
        </p>
      )}

      {tasks.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-400">📝</span>
          <input
            type="text"
            value={t.title}
            onChange={(e) => update(i, e.target.value)}
            placeholder="과제 이름 (예: 수학 문제집 5쪽)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg"
          />
          <button
            type="button"
            onClick={() => removeTask(i)}
            className="text-rose-400 px-2 py-1 rounded hover:bg-rose-50"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addTask}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-300 text-emerald-600 font-bold hover:bg-emerald-50"
      >
        + 과제 추가
      </button>
    </div>
  );
}
