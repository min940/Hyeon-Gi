import type { Schedule, ScheduleType, Supply } from "../../types";
import { categoryMeta, defaultTypeKey } from "../../lib/schedule";
import { useCategories } from "../../hooks/useCategories";

interface Props {
  schedules: Schedule[];
  onChange: (schedules: Schedule[]) => void;
}

// 일정 추가/수정/삭제 + 일정별 준비물 편집기. (날짜 편집과 요일 템플릿에서 공용)
export default function ScheduleEditor({ schedules, onChange }: Props) {
  const categories = useCategories("schedule");

  function update(index: number, patch: Partial<Schedule>) {
    onChange(schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSchedule() {
    onChange([
      ...schedules,
      {
        time: "08:00",
        title: "",
        type: defaultTypeKey(categories),
        supplies: [],
      },
    ]);
  }

  function removeSchedule(index: number) {
    onChange(schedules.filter((_, i) => i !== index));
  }

  function updateSupply(si: number, pi: number, patch: Partial<Supply>) {
    const supplies = schedules[si].supplies.map((sup, i) =>
      i === pi ? { ...sup, ...patch } : sup,
    );
    update(si, { supplies });
  }

  function addSupply(si: number) {
    update(si, {
      supplies: [...schedules[si].supplies, { name: "", checked: false }],
    });
  }

  function removeSupply(si: number, pi: number) {
    update(si, {
      supplies: schedules[si].supplies.filter((_, i) => i !== pi),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {schedules.length === 0 && (
        <p className="text-slate-400 text-center py-4">
          아직 일정이 없습니다. 아래 버튼으로 추가하세요.
        </p>
      )}

      {schedules.map((s, si) => {
        const meta = categoryMeta(categories, s.type);
        return (
          <div
            key={si}
            className={`rounded-2xl border-2 p-4 ${meta.card}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={s.time}
                onChange={(e) => update(si, { time: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
              />
              <select
                value={s.type}
                onChange={(e) =>
                  update(si, { type: e.target.value as ScheduleType })
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-lg bg-white"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeSchedule(si)}
                className="ml-auto text-rose-500 font-semibold px-3 py-2 rounded-lg hover:bg-rose-50"
              >
                🗑️ 삭제
              </button>
            </div>

            <input
              type="text"
              value={s.title}
              onChange={(e) => update(si, { title: e.target.value })}
              placeholder="일정 이름 (예: 학교 등교)"
              className="w-full mt-3 rounded-lg border border-slate-300 px-3 py-2 text-lg"
            />

            {/* 준비물 */}
            <div className="mt-3 pl-2 border-l-4 border-slate-200">
              <p className="text-sm font-semibold text-slate-500 mb-2">
                준비물
              </p>
              <div className="flex flex-col gap-2">
                {s.supplies.map((sup, pi) => (
                  <div key={pi} className="flex items-center gap-2">
                    <span className="text-slate-400">🎒</span>
                    <input
                      type="text"
                      value={sup.name}
                      onChange={(e) =>
                        updateSupply(si, pi, { name: e.target.value })
                      }
                      placeholder="준비물 이름"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => removeSupply(si, pi)}
                      className="text-rose-400 px-2 py-1 rounded hover:bg-rose-50"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSupply(si)}
                className="mt-2 text-sm text-sky-600 font-semibold hover:underline"
              >
                + 준비물 추가
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addSchedule}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-sky-300 text-sky-600 font-bold hover:bg-sky-50"
      >
        + 일정 추가
      </button>
    </div>
  );
}
