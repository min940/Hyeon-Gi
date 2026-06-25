import { useEffect, useRef } from "react";

// 카카오 지도 JavaScript 키 (.env 에서 로드)
const KEY = import.meta.env.VITE_KAKAO_MAPS_KEY;

// 스크립트를 한 번만 로드 (여러 번 마운트돼도 1회)
let scriptPromise: Promise<void> | null = null;
function loadKakao(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { kakao?: { maps?: unknown } };
    if (w.kakao?.maps) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    // autoload=false → onload 후 kakao.maps.load 로 명시적 초기화
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
    s.async = true;
    s.onload = () => {
      const kakao = (window as unknown as { kakao: any }).kakao;
      kakao.maps.load(() => resolve());
    };
    s.onerror = () => reject(new Error("카카오 지도 로드 실패"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function KakaoMap({
  lat,
  lng,
  path,
}: {
  lat: number;
  lng: number;
  path?: { lat: number; lng: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const startLabelRef = useRef<any>(null);

  useEffect(() => {
    if (!KEY) return;
    let cancelled = false;
    loadKakao()
      .then(() => {
        if (cancelled || !ref.current) return;
        const kakao = (window as any).kakao;
        const pos = new kakao.maps.LatLng(lat, lng);

        if (!mapRef.current) {
          // 카카오 level: 작을수록 확대 (구글 zoom 16 ≈ level 3)
          mapRef.current = new kakao.maps.Map(ref.current, {
            center: pos,
            level: 3,
          });
          markerRef.current = new kakao.maps.Marker({
            position: pos,
            map: mapRef.current,
            title: "현재 위치",
          });
          // 숨겨졌다 보일 때 깨짐 방지
          mapRef.current.relayout();
        } else {
          markerRef.current.setPosition(pos);
        }

        // 이동 경로(폴리라인) 갱신
        const pts = path ?? [];
        if (polylineRef.current) polylineRef.current.setMap(null);
        if (startMarkerRef.current) startMarkerRef.current.setMap(null);
        if (startLabelRef.current) startLabelRef.current.setMap(null);

        if (pts.length >= 2) {
          const linePath = pts.map(
            (p) => new kakao.maps.LatLng(p.lat, p.lng),
          );
          polylineRef.current = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 4,
            strokeColor: "#0ea5e9",
            strokeOpacity: 0.9,
            strokeStyle: "solid",
          });
          polylineRef.current.setMap(mapRef.current);

          // 출발점 마커 + "출발" 텍스트 라벨 (카카오는 내장 라벨이 없어 오버레이 사용)
          startMarkerRef.current = new kakao.maps.Marker({
            position: linePath[0],
            map: mapRef.current,
            title: "시작",
          });
          startLabelRef.current = new kakao.maps.CustomOverlay({
            position: linePath[0],
            yAnchor: 2.2,
            content:
              '<div style="padding:1px 6px;background:#0ea5e9;color:#fff;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;">출발</div>',
          });
          startLabelRef.current.setMap(mapRef.current);

          // 경로 전체가 보이도록 화면 맞춤
          const bounds = new kakao.maps.LatLngBounds();
          linePath.forEach((p: any) => bounds.extend(p));
          mapRef.current.setBounds(bounds);
        } else {
          // 경로 없음 → 현재 위치 중심
          mapRef.current.setCenter(pos);
          mapRef.current.setLevel(3);
        }
      })
      .catch(() => {
        /* 키 오류 등은 아래 안내가 처리 */
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, path]);

  if (!KEY) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-slate-600">
        <p className="font-semibold mb-1">카카오 지도 API 키가 설정되지 않았어요.</p>
        <p className="text-sm">
          <code className="bg-slate-200 px-1 rounded">.env</code> 의{" "}
          <code className="bg-slate-200 px-1 rounded">VITE_KAKAO_MAPS_KEY</code>{" "}
          를 입력하세요. (SETUP.md 참고)
        </p>
        <a
          href={`https://map.kakao.com/link/map/현재위치,${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-3 text-sky-600 font-semibold hover:underline"
        >
          카카오맵에서 위치 열기 ↗
        </a>
      </div>
    );
  }

  return <div ref={ref} className="w-full h-72 md:h-96" />;
}
