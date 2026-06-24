import { useEffect, useState } from "react";
import { fetchTemplate, saveTemplate } from "../../lib/data";
import type { Schedule, Task, WeekdayKey } from "../../types";
import ScheduleEditor from "./ScheduleEditor";
import TaskEditor from "./TaskEditor";
import type { LogLevel } from "../../hooks/useLog";

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
];

// 요일별 기본 일정 템플릿 관리.
export default function TemplateManager({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [day, setDay] = useState<WeekdayKey>("mon");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTemplate(day).then((t) => {
      if (!active) return;
      setSchedules(t?.schedules ?? []);
      setTasks(t?.tasks ?? []);
    });
    return () => {
      active = false;
    };
  }, [day]);

  async function handleSave() {
    setBusy(true);
    try {
      await saveTemplate(day, { schedules, tasks });
      const label = WEEKDAYS.find((w) => w.key === day)?.label;
      log("SUCCESS", `${label}요일 템플릿 저장 완료`);
    } catch (e) {
      log("ERROR", `템플릿 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // 현재 요일에 편집된 내용을 모든 요일에 복사(덮어쓰기).
  async function handleCopyToAll() {
    const label = WEEKDAYS.find((w) => w.key === day)?.label;
    if (
      !window.confirm(
        `${label}요일의 일정·과제를 다른 모든 요일에 복사할까요?\n다른 요일의 기존 내용은 덮어쓰여집니다.`,
      )
    ) {
      return;
    }
    setCopying(true);
    try {
      await Promise.all(
        WEEKDAYS.map((w) => saveTemplate(w.key, { schedules, tasks })),
      );
      log("SUCCESS", `${label}요일 템플릿을 모든 요일에 복사 완료`);
    } catch (e) {
      log("ERROR", `복사 실패: ${(e as Error).message}`);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500 text-sm">
        요일별 기본 일정을 저장해두면, 새 날짜를 열 때 자동으로 채워집니다.
        (그날그날 수정 가능)
      </p>

      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((w) => (
          <button
            key={w.key}
            onClick={() => setDay(w.key)}
            className={`w-11 h-11 rounded-full font-bold ${
              day === w.key
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div>
        <p className="font-bold text-slate-600 mb-2">기본 일정</p>
        <ScheduleEditor schedules={schedules} onChange={setSchedules} />
      </div>

      <div>
        <p className="font-bold text-slate-600 mb-2">기본 과제</p>
        <TaskEditor tasks={tasks} onChange={setTasks} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={busy || copying}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {busy ? "저장 중…" : "이 요일 템플릿 저장"}
        </button>
        <button
          onClick={handleCopyToAll}
          disabled={busy || copying}
          className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {copying ? "복사 중…" : "다른 요일에 복사"}
        </button>
      </div>
    </div>
  );
}
