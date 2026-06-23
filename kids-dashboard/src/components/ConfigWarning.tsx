// .env 의 Firebase 설정값이 비어 있을 때 보여주는 안내 화면.
// (배포 후에는 정상적으로 값이 채워져 나타나지 않는다.)
export default function ConfigWarning() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <div className="text-6xl mb-4">🛠️</div>
      <h1 className="text-2xl font-bold text-slate-700 mb-3">
        Firebase 설정이 필요해요
      </h1>
      <p className="text-lg text-slate-600 max-w-md">
        프로젝트 폴더의 <code className="bg-slate-200 px-1 rounded">.env</code>{" "}
        파일에 Firebase 설정값을 입력해 주세요.
      </p>
      <p className="text-base text-slate-500 mt-2">
        자세한 방법은 <code className="bg-slate-200 px-1 rounded">SETUP.md</code>{" "}
        문서를 참고하세요.
      </p>
    </div>
  );
}
