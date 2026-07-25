import React from 'react';
import { Camera, Sparkles, Heart } from 'lucide-react';
import heroStrip1 from '../assets/hero-strip-1.jpg';
import heroStrip2 from '../assets/hero-strip-2.jpg';
import svovLogo from '../../logo/efb37aca-ff56-493f-9c1d-f11db397f5f1.png';

export default function GuestHeroScreen({
  startGuestJourney,
  guestNotice,
  guestStep,
  hoveredStrip,
  setHoveredStrip
}) {
  return (
    <div className="w-screen h-[100dvh] shrink-0 overflow-y-auto relative flex flex-col">
      <section id="guest-hero" className="pink-hero relative z-10 px-4 py-10 md:py-12 flex-grow flex flex-col">
        {/* Floating background decorations */}
        <div className="pink-hero-decor-heart heart-1">💖</div>
        <div className="pink-hero-decor-heart heart-2">💝</div>
        <div className="pink-hero-decor-heart heart-3">💕</div>
        <div className="pink-hero-decor-sparkle spark-1">✨</div>
        <div className="pink-hero-decor-sparkle spark-3">✨</div>

        <div className="pink-hero-shell">
          <div className="pink-hero-main">
            <div className="pink-hero-copy">
              <div className="pink-hero-brand">
                <img src={svovLogo} alt="SVOV - Seven Vibes One Vision" className="pink-hero-logo" />
              </div>
              <h1 className="pink-title pink-hero-title relative">
                <span className="pink-title-line">SNAP <Heart className="pink-title-heart-one" aria-hidden="true" fill="currentColor" /></span>
                <span className="pink-title-line">FOR <Heart className="pink-title-heart-two" aria-hidden="true" fill="currentColor" /></span>
                <span>HOPE</span>
              </h1>
              <p className="pink-hero-lead">
                Giữ lại những khoảnh khắc đáng yêu theo cách thật tự nhiên, thật vui và đậm chất riêng của bạn.
              </p>
              <div className="pink-hero-actions">
                <button type="button" onClick={() => startGuestJourney('photobooth')} className="pink-btn pink-hero-btn text-xl">
                  <Camera className="size-6" /> Bắt đầu chụp
                </button>
                {guestNotice && guestStep === 'hero' && (
                  <p className="pink-alert">{guestNotice}</p>
                )}
              </div>
            </div>

            <div className="pink-hero-stage">
              {/* Left Panel: Premium Floating Photo Strips */}
              <div className="pink-hero-visual">
                <div className="photo-strip-wrapper">
                  {/* Strip 1: Warm Tone */}
                  <button
                    type="button"
                    className={`photo-strip-container strip-warm ${hoveredStrip === 'warm' ? 'is-hovered' : ''} ${hoveredStrip === 'cool' ? 'is-dimmed' : ''}`}
                    onClick={() => startGuestJourney('photobooth')}
                    onPointerEnter={() => setHoveredStrip('warm')}
                    onPointerLeave={() => setHoveredStrip(null)}
                    onFocus={() => setHoveredStrip('warm')}
                    onBlur={() => setHoveredStrip(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') startGuestJourney('photobooth');
                    }}
                    tabIndex={0}
                    aria-label="Start photobooth strip"
                    title="Bấm để bắt đầu chụp ảnh"
                  >
                    <div className="photo-strip strip-warm-card">
                      <img
                        src={heroStrip1}
                        alt="Quán Chill Studio strip ấm"
                        className="w-full h-auto rounded-lg object-cover"
                      />
                    </div>
                  </button>

                  {/* Strip 2: Cool Tone */}
                  <button
                    type="button"
                    className={`photo-strip-container strip-cool ${hoveredStrip === 'cool' ? 'is-hovered' : ''} ${hoveredStrip === 'warm' ? 'is-dimmed' : ''}`}
                    onClick={() => startGuestJourney('photobooth')}
                    onPointerEnter={() => setHoveredStrip('cool')}
                    onPointerLeave={() => setHoveredStrip(null)}
                    onFocus={() => setHoveredStrip('cool')}
                    onBlur={() => setHoveredStrip(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') startGuestJourney('photobooth');
                    }}
                    tabIndex={0}
                    aria-label="Start photobooth strip"
                    title="Bấm để bắt đầu chụp ảnh"
                  >
                    <div className="photo-strip strip-cool-card">
                      <img
                        src={heroStrip2}
                        alt="Quán Chill Studio strip mát"
                        className="w-full h-auto rounded-lg object-cover"
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Panel: Minimalist Timeline Guide */}
              <div className="pink-hero-timeline-guide">
                <h3 className="timeline-guide-title">
                  <Sparkles className="size-4 text-pink-500" />
                  Cách thức hoạt động
                </h3>
                
                <div className="timeline-steps">
                  <div className="timeline-line" />
                  
                  <div className="timeline-step">
                    <div className="timeline-node" />
                    <div className="timeline-content">
                      <h4>01. CHỤP ẢNH TỰ ĐỘNG</h4>
                      <p>Nhìn vào camera. Máy tự động chụp nhanh từ 4 đến 6 khoảnh khắc tùy chế độ.</p>
                    </div>
                  </div>

                  <div className="timeline-step">
                    <div className="timeline-node" />
                    <div className="timeline-content">
                      <h4>02. LỰA CHỌN ẢNH</h4>
                      <p>Chọn các tấm ảnh xinh nhất (hoặc chọn 1 ảnh thẻ tốt nhất) để chuẩn bị in.</p>
                    </div>
                  </div>

                  <div className="timeline-step">
                    <div className="timeline-node" />
                    <div className="timeline-content">
                      <h4>03. CĂN CHỈNH & IN</h4>
                      <p>Tự do căn chỉnh tỷ lệ, xoay góc ảnh và nhận bản in chất lượng cao lấy liền.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="guest-hero-draft"
        className="relative z-10 min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#fce7f3_0,#fbcfe8_18%,transparent_36%),radial-gradient(circle_at_80%_16%,#f9a8d4_0,transparent_26%),linear-gradient(135deg,#ffe4f1_0%,#fff1f6_42%,#f7d5ff_100%)] px-5 py-8 text-fuchsia-950 sm:px-8 lg:px-12"
        hidden
      >
        <div className="absolute -left-16 top-14 size-52 rounded-full bg-pink-300/45 blur-sm" />
        <div className="absolute -left-20 top-48 size-44 rounded-full border border-white/70 bg-white/20 shadow-[inset_0_0_45px_rgba(255,255,255,.8)]" />
        <div className="absolute left-4 top-8 h-24 w-20 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 opacity-70 blur-[1px]" />
        <div className="absolute right-8 top-10 size-24 rounded-full bg-pink-200/50 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-44 w-72 rounded-tl-full bg-pink-300/30 blur-2xl" />
        <Sparkles className="absolute left-[8%] top-[28%] size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]" />
        <Sparkles className="absolute left-[34%] top-[13%] size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]" />
        <Sparkles className="absolute right-[30%] top-[7%] size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]" />
        <Heart className="absolute right-[18%] top-[12%] size-12 rotate-12 fill-pink-200 text-pink-300 drop-shadow-xl" />
        <Heart className="absolute left-[12%] bottom-[10%] size-14 rotate-[9deg] fill-pink-200 text-pink-300 drop-shadow-xl" />

        <section className="relative z-10 mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="mx-auto max-w-xl lg:mx-0 lg:pl-24 xl:pl-32">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-pink-200 bg-white/70 px-5 py-3 font-extrabold text-pink-600 shadow-lg shadow-pink-200/50 backdrop-blur">
              <span className="flex size-10 items-center justify-center rounded-full bg-pink-500 text-white shadow-md shadow-pink-400/40">
                <Camera className="size-5" />
              </span>
              Photobooth tự động
            </div>

            <h1 className="select-none text-[4.8rem] font-semibold leading-[0.82] tracking-[-0.08em] text-white drop-shadow-[0_10px_0_rgba(255,255,255,.6)] sm:text-[6.4rem] xl:text-[7.4rem]">
              <span className="block text-pink-500 [text-shadow:_0_6px_0_rgba(255,255,255,.8)]">
                Quán
              </span>
              <span className="block text-pink-400 [text-shadow:_0_6px_0_rgba(255,255,255,.8)]">
                Chill
              </span>
              <span className="block text-fuchsia-700 [text-shadow:_0_6px_0_rgba(255,255,255,.75)]">
                Studio
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-xl font-extrabold leading-relaxed text-fuchsia-950/80 sm:text-2xl">
              Giữ lại những khoảnh khắc đáng yêu theo cách thật tự nhiên, thật vui và đậm chất riêng của bạn.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => startGuestJourney('photobooth')}
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-9 py-5 text-2xl font-black text-white shadow-[0_20px_55px_rgba(236,72,153,.4)] transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(236,72,153,.5)]"
              >
                <Camera className="size-7 transition group-hover:rotate-[-8deg]" />
                Bắt đầu chụp
              </button>
              {guestNotice && guestStep === 'hero' && (
                <p className="pink-alert max-w-sm">{guestNotice}</p>
              )}
            </div>
          </div>

          <div className="relative min-h-[610px] pr-0 xl:pr-44">
            <div className="relative mx-auto w-full max-w-[520px] rounded-[2.4rem] border border-white/80 bg-white/45 p-5 shadow-[0_30px_100px_rgba(219,39,119,.22)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="size-3.5 rounded-full bg-pink-400" />
                  <span className="size-3.5 rounded-full bg-yellow-300" />
                  <span className="size-3.5 rounded-full bg-cyan-300" />
                </div>
                <Heart className="size-6 text-pink-300" />
              </div>

              <div className="relative flex min-h-[310px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-pink-100 via-pink-50 to-rose-200 shadow-inner">
                <Sparkles className="absolute left-10 top-8 size-8 text-yellow-200" />
                <Heart className="absolute right-10 top-14 size-8 text-pink-300" />
                <Heart className="absolute bottom-8 right-12 size-6 text-pink-300" />
                <div className="absolute size-72 rounded-full border-[18px] border-white/60" />
                <div className="absolute size-52 rounded-full border-[22px] border-pink-400/90 shadow-[0_0_35px_rgba(236,72,153,.35)]" />
                <div className="z-10 flex size-32 items-center justify-center rounded-full bg-white/90 shadow-[0_20px_50px_rgba(236,72,153,.25)]">
                  <Camera className="size-16 text-pink-500" />
                </div>
                <p className="absolute bottom-10 z-10 rounded-full bg-white/35 px-4 py-2 text-sm font-bold text-pink-400">
                  Nhìn vào camera nhé!
                </p>
              </div>

              <div className="mt-5 grid grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <button
                    type="button"
                    key={`hero-step-${index + 1}`}
                    className="h-16 rounded-2xl border border-pink-200 bg-white/50 text-sm font-black text-pink-500 shadow-sm transition hover:-translate-y-1 hover:bg-white/80"
                  >
                    <Sparkles className="mx-auto size-4 text-pink-300" />
                    {String(index + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            <div className="absolute -right-8 top-28 z-20 hidden w-72 rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_25px_80px_rgba(190,24,93,.24)] backdrop-blur-xl lg:block">
              <div className="mb-4 flex items-center gap-2 text-lg font-black text-pink-500">
                <Sparkles className="size-5" />
                Cách dùng nhanh
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
                    1
                  </div>
                  <span className="text-sm leading-snug text-fuchsia-950">
                    <strong className="block text-pink-600 font-extrabold mb-0.5">Chụp ảnh</strong>
                    Tự động chụp từ 4 đến 6 khoảnh khắc
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
                    2
                  </div>
                  <span className="text-sm leading-snug text-fuchsia-950">
                    <strong className="block text-pink-600 font-extrabold mb-0.5">Chọn ảnh & Khung</strong>
                    Lựa chọn ảnh yêu thích tùy chế độ
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
                    3
                  </div>
                  <span className="text-sm leading-snug text-fuchsia-950">
                    <strong className="block text-pink-600 font-extrabold mb-0.5">Căn chỉnh & In</strong>
                    Cân đối ảnh và nhận bản in lấy ngay
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
