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
            title: "현재 위치",
          });
        } else {
          markerRef.current.setPosition(pos);
        }

        // 이동 경로(폴리라인) 갱신
        const pts = path ?? [];
        if (polylineRef.current) polylineRef.current.setMap(null);
        if (startMarkerRef.current) startMarkerRef.current.setMap(null);

        if (pts.length >= 2) {
          polylineRef.current = new g.maps.Polyline({
            path: pts,
            geodesic: true,
            strokeColor: "#0ea5e9",
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map: mapRef.current,
          });
          // 출발점 마커
          startMarkerRef.current = new g.maps.Marker({
            position: pts[0],
            map: mapRef.current,
            title: "시작",
            label: { text: "출발", fontSize: "11px" },
          });
          // 경로 전체가 보이도록 화면 맞춤
          const bounds = new g.maps.LatLngBounds();
          pts.forEach((p) => bounds.extend(p));
          mapRef.current.fitBounds(bounds);
        } else {
          // 경로 없음 → 현재 위치 중심
          mapRef.current.setCenter(pos);
          mapRef.current.setZoom(16);
        }
      })
      .catch(() => {
        /* 키 오류 등은 아래 안내가 처리 */
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, path]);

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
