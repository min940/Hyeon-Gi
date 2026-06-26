# UI 컴포넌트 키트 (Hyeon-Gi 디자인 시스템)

바로 쓸 수 있는 재사용 컴포넌트 모음입니다. **다른 프로젝트로 옮기려면 이 `ui/` 폴더를 통째로 복사**하세요.

## 전제 조건
- **Tailwind CSS** 사용 (이 컴포넌트들은 Tailwind 유틸리티 클래스로 스타일됨)
- 아이콘은 선택: `lefticon`/`rightIcon`에 아무 ReactNode(예: lucide-react 아이콘)나 넣으면 됨
- (권장) 폰트 `Pretendard`, `body` 에 `bg-sky-50 text-slate-800`

## 빠른 사용

```tsx
import { Button, Card, Badge, Modal, ConfirmModal } from "./components/ui";
import { Save, Trash2 } from "lucide-react";
import { useState } from "react";

function Demo() {
  const [ask, setAsk] = useState(false);

  return (
    <div className="max-w-md mx-auto p-5 flex flex-col gap-4">
      {/* 카드 */}
      <Card>
        <h2 className="font-bold text-slate-700">기본 카드</h2>
        <p className="text-slate-500">흰 배경 + 둥근 모서리 + 옅은 그림자</p>
      </Card>

      {/* 색 카드 + 배지 */}
      <Card tone="amber">
        <Badge color="amber" emoji="⭐">오늘의 별</Badge>
      </Card>

      {/* 버튼들 */}
      <div className="flex flex-wrap gap-2">
        <Button leftIcon={<Save size={18} strokeWidth={2.4} />}>기본</Button>
        <Button variant="success">저장</Button>
        <Button variant="danger" leftIcon={<Trash2 size={16} />}>삭제</Button>
        <Button variant="secondary">취소</Button>
        <Button variant="ghost" size="sm">더보기</Button>
      </div>

      <Button variant="success" size="lg" fullWidth>
        큰 버튼 (전체 너비)
      </Button>

      {/* 확인 모달 */}
      <Button variant="danger" onClick={() => setAsk(true)}>삭제 확인 열기</Button>
      <ConfirmModal
        open={ask}
        emoji="🗑️"
        title="삭제할까요?"
        description="“수학 숙제”"
        danger
        confirmLabel="네, 삭제"
        cancelLabel="아니요"
        onConfirm={() => console.log("deleted")}
        onClose={() => setAsk(false)}
      />
    </div>
  );
}
```

## 컴포넌트 API

### `<Button>`
| prop | 값 | 설명 |
|------|-----|------|
| `variant` | `primary`(기본·하늘) \| `success`(초록) \| `danger`(분홍) \| `secondary`(흰+테두리) \| `ghost` | 종류 |
| `size` | `sm` \| `md`(기본) \| `lg` | 크기 |
| `fullWidth` | boolean | 전체 너비 |
| `leftIcon` / `rightIcon` | ReactNode | 아이콘 |
| 그 외 | `<button>` 표준 속성 (onClick, disabled 등) | |

### `<Card>`
| prop | 값 | 설명 |
|------|-----|------|
| `tone` | `UIColor` (sky/amber/…) | 색 카드 (생략 시 흰 카드) |
| `padded` | boolean(기본 true) | 내부 패딩 |
| `className` | string | 추가 클래스 |

### `<Badge>`
| prop | 값 |
|------|-----|
| `color` | `UIColor` (기본 slate) |
| `emoji` | 앞에 붙는 이모지 (선택) |

### `<Modal>` / `<ConfirmModal>`
- `Modal`: `open`, `onClose`, `children` — 배경/ESC 로 닫힘.
- `ConfirmModal`: `open`, `title`, `description?`, `emoji?`, `confirmLabel?`, `cancelLabel?`, `danger?`, `onConfirm`, `onClose`.

## 색상 규칙 (직접 클래스 쓸 때)
연한 배경 `-50`, 배지 `-100`, 테두리 `-200`, 강조/버튼 `-500`, 진한 글자 `-700`.
색 팔레트는 `colors.ts`의 `BADGE_CLASSES` / `SOFT_CARD_CLASSES` / `DOT_CLASSES` 에서 관리합니다.
