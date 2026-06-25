import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { openKakaoMap } from "../../lib/maps";

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const startLabelRef = useRef<any>(null);
  // 두 손가락 제스처 추적 (오버레이가 직접 지도 이동/확대 처리)
  const gesture = useRef({ cx: 0, cy: 0, refDist: 0, active: false });
  const [isFull, setIsFull] = useState(false);

  // 전체화면 토글 (브라우저 Fullscreen API) — 카카오는 내장 버튼이 없어 직접 구현
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      wrapRef.current?.requestFullscreen?.();
    }
  }

  // 터치 기기(전체화면 아님)에서는 투명 오버레이가 터치를 받아
  // 한 손가락=페이지 스크롤, 두 손가락=지도 조작을 직접 처리.
  // 그 외(데스크톱·전체화면)에서는 카카오 기본 조작(마우스/한 손가락).
  function applyInteractionMode() {
    if (!mapRef.current) return;
    const touch = "ontouchstart" in window;
    const full = document.fullscreenElement === wrapRef.current;
    const cover = touch && !full; // 오버레이로 가림
    if (overlayRef.current) {
      overlayRef.current.style.pointerEvents = cover ? "auto" : "none";
    }
    mapRef.current.setDraggable(!cover);
    mapRef.current.setZoomable(!cover);
  }

  // 전체화면 진입/해제 시 지도 크기 재계산(relayout) — 안 하면 회색으로 깨짐
  useEffect(() => {
    function onChange() {
      const full = document.fullscreenElement === wrapRef.current;
      setIsFull(full);
      // 레이아웃이 바뀐 뒤 한 박자 늦게 보정
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.relayout();
          mapRef.current.setCenter(
            new (window as any).kakao.maps.LatLng(lat, lng),
          );
          applyInteractionMode();
        }
      }, 100);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [lat, lng]);

  // 투명 오버레이 제스처: 한 손가락은 페이지 스크롤(브라우저 기본),
  // 두 손가락이면 지도를 직접 이동(panBy)·확대축소(setLevel).
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const centroid = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    function onStart(e: TouchEvent) {
      if (e.touches.length >= 2) {
        const c = centroid(e.touches);
        gesture.current = {
          cx: c.x,
          cy: c.y,
          refDist: dist(e.touches),
          active: true,
        };
        e.preventDefault(); // 두 손가락은 페이지 스크롤 막고 지도 조작
      }
      // 한 손가락은 그대로 둠 → 브라우저가 페이지 스크롤 처리
    }
    function onMove(e: TouchEvent) {
      if (e.touches.length < 2 || !gesture.current.active || !mapRef.current) {
        return;
      }
      e.preventDefault();
      const map = mapRef.current;
      const g = gesture.current;
      const c = centroid(e.touches);
      // 이동: 손가락을 따라 지도 이동
      map.panBy(-(c.x - g.cx), -(c.y - g.cy));
      g.cx = c.x;
      g.cy = c.y;
      // 확대/축소: 두 손가락 간격 변화
      const d = dist(e.touches);
      const r = d / g.refDist;
      const lvl = map.getLevel();
      if (r > 1.4 && lvl > 1) {
        map.setLevel(lvl - 1);
        g.refDist = d;
      } else if (r < 0.7 && lvl < 14) {
        map.setLevel(lvl + 1);
        g.refDist = d;
      }
    }
    function onEnd(e: TouchEvent) {
      if (e.touches.length < 2) gesture.current.active = false;
    }
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

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
          // 터치 기기: 오버레이로 한 손가락 스크롤 / 두 손가락 조작
          applyInteractionMode();
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
        <button
          onClick={() => openKakaoMap(lat, lng)}
          className="inline-block mt-3 text-sky-600 font-semibold hover:underline"
        >
          카카오맵 앱에서 위치 열기 ↗
        </button>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`relative ${
        isFull ? "w-screen h-screen bg-white" : "w-full h-72 md:h-96"
      }`}
    >
      <div ref={ref} className="absolute inset-0" />
      {/* 투명 제스처 오버레이 — 한 손가락 스크롤, 두 손가락 지도 조작.
          touch-action: pan-y 로 한 손가락 세로 스크롤은 브라우저가 처리.
          pointerEvents 는 applyInteractionMode 가 켜고 끔(터치 기기에서만 가림). */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ touchAction: "pan-y", pointerEvents: "none" }}
      />
      <button
        onClick={toggleFullscreen}
        title={isFull ? "전체화면 닫기" : "전체화면으로 보기"}
        className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-md transition hover:bg-white active:scale-95"
      >
        {isFull ? (
          <Minimize2 size={20} strokeWidth={2.4} />
        ) : (
          <Maximize2 size={20} strokeWidth={2.4} />
        )}
      </button>
    </div>
  );
}
