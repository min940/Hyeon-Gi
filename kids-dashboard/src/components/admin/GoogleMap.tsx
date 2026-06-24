import { useEffect, useRef } from "react";

// 구글 지도 JavaScript API 키 (.env 에서 로드)
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 스크립트를 한 번만 로드 (여러 번 마운트돼도 1회)
let scriptPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { google?: { maps?: unknown } };
    if (w.google?.maps) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&language=ko&region=KR`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("구글 지도 로드 실패"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function GoogleMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!MAPS_KEY) return;
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;
        const pos = { lat, lng };
        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(ref.current, {
            center: pos,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          markerRef.current = new g.maps.Marker({
            position: pos,
            map: mapRef.current,
            title: "자녀 위치",
          });
        } else {
          mapRef.current.setCenter(pos);
          markerRef.current.setPosition(pos);
        }
      })
      .catch(() => {
        /* 키 오류 등은 아래 안내가 처리 */
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (!MAPS_KEY) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-slate-600">
        <p className="font-semibold mb-1">구글 지도 API 키가 설정되지 않았어요.</p>
        <p className="text-sm">
          <code className="bg-slate-200 px-1 rounded">.env</code> 의{" "}
          <code className="bg-slate-200 px-1 rounded">
            VITE_GOOGLE_MAPS_API_KEY
          </code>{" "}
          를 입력하세요. (SETUP.md 참고)
        </p>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-3 text-sky-600 font-semibold hover:underline"
        >
          구글 지도에서 위치 열기 ↗
        </a>
      </div>
    );
  }

  return <div ref={ref} className="w-full h-72 md:h-96" />;
}
