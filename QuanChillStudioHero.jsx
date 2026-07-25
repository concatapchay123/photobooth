import React from "react";
import { Camera, Sparkles, Heart, Image as ImageIcon, Star } from "lucide-react";
import { LazyMotion, domAnimation, m } from "framer-motion";

const photos = [
  ["Lan", "Mai", "✌️"],
  ["An", "Vy", "♡"],
  ["Nhi", "Min", "✨"],
  ["Hà", "Linh", "😎"],
];

const steps = [
  "Bấm bắt đầu và nhìn vào camera",
  "Máy tự chụp đủ 6 khoảnh khắc",
  "Chọn 2 khung để ghép cỡ 13x18",
];

const features = [
  {
    icon: Star,
    title: "Tự động & dễ dùng",
    desc: "Chụp nhanh, thao tác đơn giản ai cũng có thể sử dụng.",
  },
  {
    icon: Heart,
    title: "6 khoảnh khắc đáng yêu",
    desc: "Lưu giữ trọn vẹn cảm xúc trong từng khung hình.",
  },
  {
    icon: ImageIcon,
    title: "Ghép ảnh tùy chọn",
    desc: "Chọn 2 khung yêu thích để in cỡ 13x18.",
  },
];

function FloatingDecor() {
  return (
    <>
      <div className="absolute -left-16 top-14 size-52 rounded-full bg-pink-300/45 blur-sm" />
      <div className="absolute -left-20 top-48 size-44 rounded-full border border-white/70 bg-white/20 shadow-[inset_0_0_45px_rgba(255,255,255,.8)]" />
      <div className="absolute left-4 top-8 h-24 w-20 rounded-full bg-gradient-to-br from-pink-200 to-pink-400 opacity-70 blur-[1px]" />
      <div className="absolute right-8 top-10 size-24 rounded-full bg-pink-200/50 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-44 w-72 rounded-tl-full bg-pink-300/30 blur-2xl" />

      {[
        "left-[8%] top-[28%]",
        "left-[34%] top-[13%]",
        "right-[30%] top-[7%]",
        "right-[21%] top-[17%]",
        "left-[43%] top-[55%]",
      ].map((pos, i) => (
        <Sparkles
          key={i}
          className={`absolute ${pos} size-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,216,120,.9)]`}
        />
      ))}

      <div className="absolute left-8 top-[38%] rotate-[-14deg] text-7xl drop-shadow-xl">💜</div>
      <div className="absolute right-[18%] top-[12%] rotate-[12deg] text-5xl drop-shadow-xl">💗</div>
      <div className="absolute right-[8%] bottom-8 rotate-[-12deg] text-8xl opacity-80">🎀</div>
      <div className="absolute left-[12%] bottom-[10%] rotate-[9deg] text-6xl drop-shadow-xl">💖</div>
    </>
  );
}

function MiniPhotobooth() {
  return (
    <m.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, duration: 0.7 }}
      className="absolute bottom-8 left-4 hidden w-40 rotate-[-8deg] rounded-[2rem] border border-white/80 bg-gradient-to-b from-white/70 to-pink-200/90 p-4 shadow-[0_25px_70px_rgba(197,33,119,.25)] backdrop-blur md:block"
    >
      <div className="rounded-2xl bg-white/70 p-2 text-center text-xs font-black uppercase leading-tight text-pink-500 shadow-inner">
        Quán Chill<br />Studio ♡
      </div>
      <div className="mx-auto mt-5 flex size-16 items-center justify-center rounded-full border-[6px] border-pink-100 bg-slate-900 shadow-inner">
        <div className="size-8 rounded-full bg-gradient-to-br from-slate-700 to-black ring-4 ring-white/20" />
      </div>
      <div className="mx-auto mt-5 h-4 w-24 rounded-full bg-pink-300 shadow-inner" />
      <div className="mx-auto -mb-12 mt-1 h-16 w-14 rounded-b-xl bg-white p-1 shadow-lg">
        <div className="grid h-full grid-cols-2 gap-1 rounded bg-pink-100 p-1">
          <span className="rounded bg-pink-300" />
          <span className="rounded bg-purple-200" />
          <span className="rounded bg-purple-200" />
          <span className="rounded bg-pink-300" />
        </div>
      </div>
    </m.div>
  );
}

function AppPreview() {
  return (
    <m.div
      initial={{ scale: 0.94, opacity: 0, y: 25 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.75 }}
      className="relative mx-auto w-full max-w-[520px] rounded-[2.4rem] border border-white/80 bg-white/45 p-5 shadow-[0_30px_100px_rgba(219,39,119,.22)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <span className="size-3.5 rounded-full bg-pink-400" />
          <span className="size-3.5 rounded-full bg-yellow-300" />
          <span className="size-3.5 rounded-full bg-cyan-300" />
        </div>
        <Heart className="size-6 text-pink-300" />
      </div>

      <div className="relative flex min-h-[310px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-pink-100 via-pink-50 to-rose-200 shadow-inner">
        <div className="absolute left-10 top-8 text-3xl">✦</div>
        <div className="absolute right-10 top-14 text-3xl">♡</div>
        <div className="absolute bottom-8 right-12 text-2xl">♡</div>
        <div className="relative size-72 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[18px] border-white/60" />
          <div className="absolute size-52 rounded-full border-[22px] border-pink-400/90 shadow-[0_0_35px_rgba(236,72,153,.35)]" />
          <div className="absolute size-32 flex items-center justify-center rounded-full bg-white/90 shadow-[0_20px_50px_rgba(236,72,153,.25)] z-10">
            <Camera className="size-16 text-pink-500 shrink-0" />
          </div>
        </div>
        <p className="absolute bottom-10 z-10 rounded-full bg-white/35 px-4 py-2 text-sm font-bold text-pink-400">
          Nhìn vào camera nhé!
        </p>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <button type="button"
            key={i}
            className="h-16 rounded-2xl border border-pink-200 bg-white/50 text-sm font-black text-pink-500 shadow-sm transition hover:-translate-y-1 hover:bg-white/80"
          >
            <span className="block text-pink-300">✦</span>
            {String(i + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
    </m.div>
  );
}

function GuideCard() {
  return (
    <m.div
      initial={{ x: 35, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.75 }}
      className="absolute -right-8 top-28 z-20 hidden w-72 rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_25px_80px_rgba(190,24,93,.24)] backdrop-blur-xl lg:block"
    >
      <div className="mb-4 flex items-center gap-2 text-lg font-black text-pink-500">
        <Sparkles className="size-5" />
        Cách dùng nhanh
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-2xl border border-pink-200/80 bg-pink-50/70 p-3 shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-lg font-black text-white shadow-lg shadow-pink-400/40">
              {index + 1}
            </div>
            <p className="text-sm font-extrabold leading-snug text-fuchsia-950">
              {step}
            </p>
          </div>
        ))}
      </div>
    </m.div>
  );
}

function PhotoStrip() {
  return (
    <m.div
      initial={{ rotate: 8, opacity: 0, x: 45 }}
      animate={{ rotate: 5, opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="absolute right-1 top-6 hidden w-48 rounded-[1.4rem] border-[10px] border-white bg-white shadow-[0_30px_90px_rgba(190,24,93,.3)] xl:block"
    >
      <div className="space-y-2">
        {photos.map((photo) => (
          <div
            key={photo.join('-')}
            className="relative h-36 overflow-hidden rounded-xl bg-gradient-to-br from-pink-200 via-rose-100 to-fuchsia-200"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.9),transparent_18%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,.7),transparent_12%),radial-gradient(circle_at_50%_70%,rgba(255,255,255,.55),transparent_18%)]" />
            <div className="absolute left-8 top-8 h-24 w-20 rounded-t-full bg-gradient-to-b from-amber-900 to-amber-600 shadow-lg">
              <div className="mx-auto mt-5 size-14 rounded-full bg-gradient-to-b from-pink-50 to-pink-200" />
              <div className="absolute bottom-0 left-2 h-10 w-16 rounded-t-3xl bg-pink-300" />
            </div>
            <div className="absolute right-8 top-8 h-24 w-20 rounded-t-full bg-gradient-to-b from-stone-800 to-stone-600 shadow-lg">
              <div className="mx-auto mt-5 size-14 rounded-full bg-gradient-to-b from-pink-50 to-pink-200" />
              <div className="absolute bottom-0 left-2 h-10 w-16 rounded-t-3xl bg-rose-300" />
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-pink-500">
              {photo[0]} + {photo[1]} {photo[2]}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute -bottom-8 -left-7 flex size-16 items-center justify-center rounded-full border-4 border-white bg-pink-100 text-4xl shadow-lg">
        ☺
      </div>
    </m.div>
  );
}

function FeatureBar() {
  return (
    <m.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.45, duration: 0.7 }}
      className="mx-auto mt-10 grid max-w-5xl gap-4 rounded-[2rem] border border-white/80 bg-white/50 p-5 shadow-[0_20px_70px_rgba(190,24,93,.16)] backdrop-blur-xl md:grid-cols-3"
    >
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <div key={feature.title} className="flex items-center gap-4 px-3">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-pink-500 text-white shadow-lg shadow-pink-400/30">
              <Icon className="size-8" />
            </div>
            <div>
              <h3 className="font-semibold text-fuchsia-950">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-fuchsia-950/65">
                {feature.desc}
              </p>
            </div>
          </div>
        );
      })}
    </m.div>
  );
}

export default function QuanChillStudioHero() {
  return (
    <LazyMotion features={domAnimation}>
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#fce7f3_0,#fbcfe8_18%,transparent_36%),radial-gradient(circle_at_80%_16%,#f9a8d4_0,transparent_26%),linear-gradient(135deg,#ffe4f1_0%,#fff1f6_42%,#f7d5ff_100%)] px-5 py-8 text-fuchsia-950 sm:px-8 lg:px-12">
      <FloatingDecor />
      <MiniPhotobooth />

      <section className="relative z-10 mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-xl lg:mx-0 lg:pl-24 xl:pl-32"
        >
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

          <button type="button" className="group mt-9 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-9 py-5 text-2xl font-black text-white shadow-[0_20px_55px_rgba(236,72,153,.4)] transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(236,72,153,.5)]">
            <Camera className="size-7 transition group-hover:rotate-[-8deg]" />
            Bắt đầu chụp
          </button>
        </m.div>

        <div className="relative min-h-[610px] pr-0 xl:pr-44">
          <AppPreview />
          <GuideCard />
          <PhotoStrip />
        </div>
      </section>

      <div className="relative z-20 -mt-24 hidden lg:block">
        <FeatureBar />
      </div>
      </main>
    </LazyMotion>
  );
}
