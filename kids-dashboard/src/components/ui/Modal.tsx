import { useEffect, type ReactNode } from "react";
import { cn } from "./cn";
import { Button } from "./Button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

// 기본 모달: 어두운 배경 + 둥근 흰 카드. 배경/ESC 로 닫힘.
// 사용 예:
//   <Modal open={open} onClose={() => setOpen(false)}>내용</Modal>
export function Modal({ open, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-xs rounded-3xl bg-white p-6 shadow-xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export interface ConfirmModalProps {
  open: boolean;
  emoji?: string;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // true 면 확인 버튼이 분홍(삭제/경고)
  onConfirm: () => void;
  onClose: () => void;
}

// 확인 모달: 큰 이모지 + 제목 + [취소]/[확인]. onConfirm 후 자동으로 onClose 호출.
// 사용 예:
//   <ConfirmModal open={open} emoji="🗑️" title="삭제할까요?" description="이 항목"
//     danger confirmLabel="네, 삭제" onConfirm={remove} onClose={() => setOpen(false)} />
export function ConfirmModal({
  open,
  emoji = "🤔",
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} className="text-center">
      <p className="text-5xl">{emoji}</p>
      {description && (
        <p className="mt-3 break-words text-lg font-semibold text-slate-500">
          {description}
        </p>
      )}
      <p className="mt-1 text-2xl font-extrabold text-slate-800">{title}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" fullWidth onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={danger ? "danger" : "success"}
          fullWidth
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
