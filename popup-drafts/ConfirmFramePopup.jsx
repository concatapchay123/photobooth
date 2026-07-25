import React, { useState } from 'react';
import { Sparkles, Heart, Images, CheckCircle2, Plus, Minus, Palette } from 'lucide-react';

// ==========================================
// 1. COMPONENT "App" (MÔI TRƯỜNG PLAYGROUND ĐỂ XEM PREVIEW TRỰC TIẾP TRÊN CANVAS)
// ==========================================
export default function App() {
  const [previewState, setPreviewState] = useState({ isOpen: true, busy: false });
  const [frameTarget, setFrameTarget] = useState(2);
  const [frameNames, setFrameNames] = useState('1. Khung Thạch Dâu • 2. Khung Đại Dương');
  const [toast, setToast] = useState(null);
  const { isOpen, busy } = previewState;

  const handleConfirm = () => {
    setPreviewState((current) => ({ ...current, busy: true }));
    showToast('🖼️ Bé Bạch Tuộc đang đóng khung gỗ phép thuật… Đợi xíu nhe!');
    
    // Giả lập thời gian ghép và xuất bản khung ảnh
    setTimeout(() => {
      setPreviewState({ isOpen: false, busy: false });
      showToast('🎉 Ghép khung thành công! Thành quả in 13x18 đẹp lung linh luôn á! 😍🖼️');
    }, 2800);
  };

  const handleCancel = () => {
    setPreviewState((current) => ({ ...current, isOpen: false }));
    showToast('🎨 Bạch Tuộc gật gù: Lựa thêm vài mẫu khung xinh rồi chốt sau nha!');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="preview-container">
      <style>{`
        .preview-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #fff0f3;
          background-image: 
            radial-gradient(at 10% 15%, rgba(254, 240, 138, 0.4) 0px, transparent 40%),
            radial-gradient(at 90% 85%, rgba(186, 230, 253, 0.45) 0px, transparent 40%),
            radial-gradient(at 50% 50%, #ffffff 0%, transparent 80%);
          font-family: system-ui, -apple-system, sans-serif;
          padding: 24px;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .playground-card {
          max-width: 450px;
          width: 100%;
          background: #ffffff;
          padding: 32px 24px;
          border-radius: 36px;
          box-shadow: 
            0 12px 35px rgba(217, 119, 6, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.02);
          border: 4px solid #fef3c7;
          text-align: center;
          position: relative;
        }

        .playground-title {
          font-size: 24px;
          font-weight: 1000;
          color: #d97706;
          margin: 0 0 8px;
        }

        .playground-desc {
          font-size: 14px;
          color: #a16207;
          line-height: 1.6;
          margin: 0 0 20px;
        }

        /* Bộ chỉnh mẫu thử nghiệm trên Playground */
        .playground-tools {
          background: #fffbeb;
          padding: 16px;
          border-radius: 24px;
          border: 2px dashed #fde68a;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }

        .tool-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .tool-label {
          font-size: 13px;
          font-weight: 800;
          color: #78350f;
        }

        .counter-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .counter-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #fbbf24;
          color: #78350f;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.15s;
        }

        .counter-btn:hover {
          transform: scale(1.1);
        }

        .counter-val {
          font-size: 16px;
          font-weight: 900;
          color: #d97706;
          min-width: 20px;
        }

        .text-input {
          flex: 1;
          border: 2px solid #fef3c7;
          border-radius: 12px;
          padding: 6px 12px;
          font-size: 13px;
          color: #78350f;
          outline: none;
        }

        .text-input:focus {
          border-color: #f59e0b;
        }

        .summon-btn {
          background: linear-gradient(135deg, #fbbf24 0%, #ff527b 100%);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 28px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(251, 191, 36, 0.3);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .summon-btn:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 12px 22px rgba(251, 191, 36, 0.4);
        }

        /* Toast thông báo dễ thương */
        .cute-toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: #78350f;
          color: #fff;
          padding: 14px 28px;
          border-radius: 50px;
          font-size: 13.5px;
          font-weight: 800;
          box-shadow: 0 15px 35px rgba(120, 53, 15, 0.3);
          z-index: 2000;
          animation: toast-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          border: 2px solid rgba(255, 255, 255, 0.15);
        }

        @keyframes toast-slide-up {
          from { bottom: -60px; opacity: 0; }
          to { bottom: 30px; opacity: 1; }
        }
      `}</style>

      {/* Sân chơi thử nghiệm */}
      <div className="playground-card">
        <h1 className="playground-title">Mascot Gắp Khung Thủy Cung 🖼️🐙</h1>
        <p className="playground-desc">
          Bấm thay đổi thông tin số lượng và tên các mẫu khung dâu tây dưới đây để trải nghiệm bản chạy thử nhe!
        </p>
        
        <div className="playground-tools">
          <div className="tool-row">
            <span className="tool-label">Số khung tranh in:</span>
            <div className="counter-wrap">
              <button type="button" className="counter-btn" onClick={() => setFrameTarget((current) => Math.max(1, current - 1))}>
                <Minus size={12} />
              </button>
              <span className="counter-val">{frameTarget}</span>
              <button type="button" className="counter-btn" onClick={() => setFrameTarget((current) => current + 1)}>
                <Plus size={12} />
              </button>
            </div>
          </div>
          
          <div className="tool-row">
            <span className="tool-label">Tên khung:</span>
            <input 
              type="text" 
              className="text-input" 
              value={frameNames} 
              aria-label="Frame names"
              onChange={(e) => setFrameNames(e.target.value)} 
            />
          </div>
        </div>

        <button type="button" className="summon-btn" onClick={() => setPreviewState((current) => ({ ...current, isOpen: true }))}>
          Mở Popup Ghép Khung Xinh ✨
        </button>
      </div>

      {toast && <div className="cute-toast">🫧 {toast}</div>}

      {/* HIỂN THỊ POPUP GHÉP KHUNG */}
      {isOpen && (
        <ConfirmFramePopup
          frameNames={frameNames}
          frameTarget={frameTarget}
          busy={busy}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}


// ==========================================
// 2. COMPONENT POPUP PHIÊN BẢN BẠCH TUỘC GHÉP KHUNG
// ==========================================
export function ConfirmFramePopup({
  frameNames = '1. khung xinh • 2. khung xinh',
  frameTarget = 2,
  busy = false,
  onCancel = () => {},
  onConfirm = () => {},
} = {}) {
  return (
    <dialog
      open
      className="frame-popup-backdrop"
      aria-modal="true"
    >
      <style>{`
        /* --- BACKDROP ĐẠI DƯƠNG NẮNG VÀNG SỮA --- */
        .frame-popup-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: 
            radial-gradient(circle at 80% 15%, rgba(254, 240, 138, 0.45), transparent 45%),
            radial-gradient(circle at 15% 85%, rgba(186, 230, 253, 0.45), transparent 45%),
            rgba(56, 15, 26, 0.4);
          background: transparent;
          backdrop-filter: none;
          animation: frame-ocean-backdrop-in 0.3s ease-out forwards;
        }

        /* --- POPUP CHÍNH: ĐÁM MÂY KHUNG XINH --- */
        .frame-popup {
          position: relative;
          width: min(100%, 420px);
          border: 6px solid #fff;
          border-radius: 46px;
          background: linear-gradient(135deg, #ffffff 0%, #fff7f2 50%, #fff0f3 100%);
          color: #571122;
          text-align: center;
          box-shadow: 
            0 12px 0 #fed7aa,
            0 32px 65px rgba(87, 17, 34, 0.22);
          animation: frame-ocean-pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: visible;
        }

        .frame-popup__body {
          padding: 38px 26px 28px;
        }

        /* --- NHÃN RUY BĂNG KHUNG NGHỆ THUẬT --- */
        .art-ribbon {
          position: absolute;
          top: -14px;
          left: 30px;
          background: #fef3c7;
          border: 2px solid #fde68a;
          color: #b45309;
          padding: 4px 14px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 1000;
          box-shadow: 0 4px 10px rgba(180, 83, 9, 0.1);
          transform: rotate(-3deg);
          animation: ribbon-float 0.9s infinite alternate;
        }

        /* --- MASCOT BẠCH TUỘC KHÉO TAY GHÉP KHUNG --- */
        .mascot-container {
          position: relative;
          width: 140px;
          height: 130px;
          margin: -15px auto 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: octopus-swim-frame 0.9s ease-in-out infinite;
        }

        /* Bong bóng sủi tăm khi bơi */
        .sea-bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.85);
          border: 1.5px solid #ffccd5;
          border-radius: 50%;
          animation: bubble-float-up 0.9s infinite linear;
          opacity: 0;
          pointer-events: none;
        }
        .sea-bubble--1 { width: 10px; height: 10px; left: 10px; bottom: 32px; animation-delay: 0.4s; }
        .sea-bubble--2 { width: 14px; height: 14px; right: 10px; bottom: 44px; animation-delay: 0.9s; }
        .sea-bubble--3 { width: 8px; height: 8px; left: 52%; bottom: 6px; animation-delay: 0.9s; }

        /* Ngôi sao lấp lánh retro pixel */
        .pixel-sparkle {
          position: absolute;
          color: #ffca3a;
          animation: sparkle-blink-retro 0.9s ease-in-out infinite;
        }
        .pixel-sparkle--1 { top: 10px; left: -10px; animation-delay: 0.3s; }
        .pixel-sparkle--2 { bottom: 42px; right: -12px; animation-delay: 0.9s; }

        /* --- TYPOGRAPHY ĐÁNG YÊU --- */
        .frame-popup__eyebrow {
          display: inline-block;
          margin: 0 0 10px;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 1.5px solid #fde68a;
          color: #d97706;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 20px;
        }

        .frame-popup__title {
          margin: 0;
          color: #4a0516;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .frame-popup__message {
          margin: 12px 0 0;
          color: #8c515e;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- METER: HIỂN THỊ TÊN KHUNG --- */
        .frame-popup__names {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 22px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 2px dashed #ffb3c1;
          padding: 10px 18px;
          color: #b45309;
          font-size: 12.5px;
          font-weight: 900;
          line-height: 1.4;
          text-align: left;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.04);
        }

        /* --- NÚT BẤM JELLY BONG BÓNG SIÊU NẨY --- */
        .frame-popup__actions {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 12px;
          margin-top: 26px;
        }

        .frame-popup__button {
          position: relative;
          min-height: 52px;
          border: 0;
          border-radius: 26px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          outline: none;
        }

        /* Nút Hủy (Marshmallow) */
        .frame-popup__button--ghost {
          background: #fff;
          border: 2.5px solid #ffccd5;
          color: #ff527b;
          box-shadow: 0 5px 0 #ffccd5;
        }

        .frame-popup__button--ghost:hover:not(:disabled) {
          background: #fff0f3;
          transform: translateY(-2px);
          box-shadow: 0 7px 0 #ffccd5;
          animation: button-wiggle-soft 0.5s ease-in-out;
        }

        /* Nút Chốt (Jelly Hồng Dâu) */
        .frame-popup__button--primary {
          background: linear-gradient(135deg, #fbbf24 0%, #ff527b 55%, #f43f5e 100%);
          background-size: 200% auto;
          color: #fff;
          box-shadow: 
            0 5px 0 #c2410c,
            0 12px 24px rgba(251, 191, 36, 0.24);
        }

        .frame-popup__button--primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 8px 0 #c2410c,
            0 16px 28px rgba(251, 191, 36, 0.35);
        }

        .frame-popup__button:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 1px 0 transparent;
        }

        .frame-popup__button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #ead9dc;
          box-shadow: none;
          color: #9c8488;
          border: none;
        }

        /* --- CÁC HOẠT ẢNH TỰ NHIÊN (KEYFRAMES) --- */
        @keyframes frame-ocean-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes frame-ocean-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.72) translateY(38px) rotate(2deg);
          }
          70% {
            transform: scale(1.05) translateY(-5px) rotate(-1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(0deg);
          }
        }

        @keyframes ribbon-float {
          from { transform: rotate(-3deg) translateY(0); }
          to { transform: rotate(-6deg) translateY(-3px); }
        }

        /* Bé bạch tuộc dập dềnh */
        @keyframes octopus-swim-frame {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-7px) scaleY(1.03); }
        }

        /* Các xúc tu ghép khung gỗ */
        @keyframes tentacle-graft-1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg) translateY(2px); }
        }
        @keyframes tentacle-graft-2 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg) translateX(-1px); }
        }
        @keyframes tentacle-graft-3 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg) translateX(1px); }
        }
        @keyframes tentacle-graft-4 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(12deg) translateY(-2px); }
        }

        /* Nháy màu sắc sặc sỡ của khung tranh khi đang bận hóa phép */
        @keyframes pixel-heart-glowing {
          0%, 100% { fill: #ff4d6d; }
          50% { fill: #ffca3a; }
        }

        @keyframes sparkle-blink-retro {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.25) rotate(90deg); opacity: 1; }
        }

        @keyframes bubble-float-up {
          0% {
            transform: translateY(10px) translateX(0) scale(0.6);
            opacity: 0;
          }
          30% { opacity: 0.9; }
          80% { opacity: 0.4; }
          100% {
            transform: translateY(-55px) translateX(var(--b-dx, 12px)) scale(1.1);
            opacity: 0;
          }
        }

        @keyframes button-wiggle-soft {
          0%, 100% { transform: rotate(0deg) translateY(-2px); }
          30% { transform: rotate(-3deg) translateY(-2px); }
          70% { transform: rotate(3deg) translateY(-2px); }
        }

        /* Hóa phép dải cầu vồng nút chính */
        @keyframes button-rainbow-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (max-width: 480px) {
          .frame-popup__actions {
            grid-template-columns: 1fr;
          }
          .frame-popup__button--ghost {
          color: #4a0516;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .frame-popup__message {
          margin: 12px 0 0;
          color: #8c515e;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- METER: HIỂN THỊ TÊN KHUNG --- */
        .frame-popup__names {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 22px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 2px dashed #ffb3c1;
          padding: 10px 18px;
          color: #b45309;
          font-size: 12.5px;
          font-weight: 900;
          line-height: 1.4;
          text-align: left;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.04);
        }

        /* --- NÚT BẤM JELLY BONG BÓNG SIÊU NẨY --- */
        .frame-popup__actions {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 12px;
          margin-top: 26px;
        }

        .frame-popup__button {
          position: relative;
          min-height: 52px;
          border: 0;
          border-radius: 26px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          outline: none;
        }

        /* Nút Hủy (Marshmallow) */
        .frame-popup__button--ghost {
          background: #fff;
          border: 2.5px solid #ffccd5;
          color: #ff527b;
          box-shadow: 0 5px 0 #ffccd5;
        }

        .frame-popup__button--ghost:hover:not(:disabled) {
          background: #fff0f3;
          transform: translateY(-2px);
          box-shadow: 0 7px 0 #ffccd5;
          animation: button-wiggle-soft 0.5s ease-in-out;
        }

        /* Nút Chốt (Jelly Hồng Dâu) */
        .frame-popup__button--primary {
          background: linear-gradient(135deg, #fbbf24 0%, #ff527b 55%, #f43f5e 100%);
          background-size: 200% auto;
          color: #fff;
          box-shadow: 
            0 5px 0 #c2410c,
            0 12px 24px rgba(251, 191, 36, 0.24);
        }

        .frame-popup__button--primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 8px 0 #c2410c,
            0 16px 28px rgba(251, 191, 36, 0.35);
        }

        .frame-popup__button:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 1px 0 transparent;
        }

        .frame-popup__button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #ead9dc;
          box-shadow: none;
          color: #9c8488;
          border: none;
        }

        /* --- CÁC HOẠT ẢNH TỰ NHIÊN (KEYFRAMES) --- */
        @keyframes frame-ocean-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes frame-ocean-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.72) translateY(38px) rotate(2deg);
          }
          70% {
            transform: scale(1.05) translateY(-5px) rotate(-1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(0deg);
          }
        }

        @keyframes ribbon-float {
          from { transform: rotate(-3deg) translateY(0); }
          to { transform: rotate(-6deg) translateY(-3px); }
        }

        /* Bé bạch tuộc dập dềnh */
        @keyframes octopus-swim-frame {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-7px) scaleY(1.03); }
        }

        /* Các xúc tu ghép khung gỗ */
        @keyframes tentacle-graft-1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg) translateY(2px); }
        }
        @keyframes tentacle-graft-2 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg) translateX(-1px); }
        }
        @keyframes tentacle-graft-3 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg) translateX(1px); }
        }
        @keyframes tentacle-graft-4 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(12deg) translateY(-2px); }
        }

        /* Nháy màu sắc sặc sỡ của khung tranh khi đang bận hóa phép */
        @keyframes pixel-heart-glowing {
          0%, 100% { fill: #ff4d6d; }
          50% { fill: #ffca3a; }
        }

        @keyframes sparkle-blink-retro {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.25) rotate(90deg); opacity: 1; }
        }

        @keyframes bubble-float-up {
          0% {
            transform: translateY(10px) translateX(0) scale(0.6);
            opacity: 0;
          }
          30% { opacity: 0.9; }
          80% { opacity: 0.4; }
          100% {
            transform: translateY(-55px) translateX(var(--b-dx, 12px)) scale(1.1);
            opacity: 0;
          }
        }

        @keyframes button-wiggle-soft {
          0%, 100% { transform: rotate(0deg) translateY(-2px); }
          30% { transform: rotate(-3deg) translateY(-2px); }
          70% { transform: rotate(3deg) translateY(-2px); }
        }
      `}</style>

      <section className="frame-popup">
        {/* Nhãn ruy băng trang trí nghệ sĩ */}
        <div className="art-ribbon">Phòng Ghép Khung 🎨🫧</div>

        <div className="frame-popup__body">
          
          {/* Khu vực Mascot Bé Bạch Tuộc Nâng Khung Tranh */}
          <div className="mascot-container">
            <Sparkles className="pixel-sparkle pixel-sparkle--1" size={18} />
            <Sparkles className="pixel-sparkle pixel-sparkle--2" size={20} />
            
            {/* Các bọt bong bóng liên tục sủi lên */}
            <div className="sea-bubble sea-bubble--1" style={{ '--b-dx': '-12px' }} />
            <div className="sea-bubble sea-bubble--2" style={{ '--b-dx': '12px' }} />
            <div className="sea-bubble sea-bubble--3" style={{ '--b-dx': '4px' }} />
            
            {/* BẢN VẼ TAY SVG 100% PIXEL ART KHỚP HOÀN HẢO THEO FILE ẢNH VỚI CHIẾC KHUNG GỖ TRÁI TIM */}
            <svg 
              width="115" 
              height="115" 
              viewBox="0 0 128 128" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ shapeRendering: 'crispEdges' }}
            >
              {/* Bóng chân dập dềnh */}
              <ellipse cx="64" cy="115" rx="22" ry="3" fill="#ffb7c5" opacity="0.4" />

              {/* TENTACLE 1: Xúc tu ngoài cùng bên trái (Đang chỉ hướng dâu tây) */}
              <g style={{ 
                transformOrigin: '48px 84px', 
                animation: 'tentacle-graft-1 0.9s ease-in-out infinite' 
              }}>
                <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
              </g>

              {/* TENTACLE 2: Xúc tu trong bên trái (Nâng đỡ bức tranh trái tim) */}
              <g style={{ 
                transformOrigin: '52px 86px', 
                animation: 'tentacle-graft-2 0.9s ease-in-out infinite' 
              }}>
                <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />
                
                {/* CHIẾC KHUNG TRANH MINI CUTE ĐƯỢC ĐỠ BÊN TRÁI */}
                <rect x="28" y="84" width="16" height="16" rx="2" fill="#ffca3a" stroke="#5c1123" strokeWidth="1.5" />
                {/* Trái tim hồng nhỏ bên trong khung gỗ */}
                <path d="M33 91C33 89 35 88 36 89C37 88 39 89 39 91C39 93 36 95 36 95C36 95 33 93 33 91Z" fill="#ff527b" style={busy ? { animation: 'pixel-heart-glowing 0.5s infinite' } : {}} />

                <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 3: Xúc tu trong bên phải (Cầm búa gỗ ghép khung) */}
              <g style={{ 
                transformOrigin: '76px 86px', 
                animation: 'tentacle-graft-3 0.9s ease-in-out infinite' 
              }}>
                <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />
                
                {/* Chiếc bọ xịt sơn màu mọng dâu ngọt ngào */}
                <rect x="80" y="86" width="12" height="14" rx="2" fill="#ff758c" stroke="#5c1123" strokeWidth="1.5" />
                <rect x="84" y="81" width="4" height="5" fill="#4fb477" />

                <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 4: Xúc tu ngoài cùng bên phải */}
              <g style={{ 
                transformOrigin: '80px 84px', 
                animation: 'tentacle-graft-4 0.9s ease-in-out infinite' 
              }}>
                <path d="M116 70H112V66H108V62H104V74H108V78H112V82H116V70Z" fill="#f19cb2" />
                <path d="M104 74H100V78H92V82H88V86H84V90H92V86H100V82H104V78H108V74H104Z" fill="#f19cb2" />
                <rect x="108" y="70" width="4" height="4" fill="#FFFFFF" />
                <rect x="96" y="78" width="8" height="4" fill="#FFFFFF" />
                <path d="M116 82H108V86H100V90H92V94H84V90H92V86H100V82H108V78H116V82Z" fill="#bc7687" opacity="0.6" />
              </g>

              {/* ĐẦU TRÒN BỰ BẤM BĨNH (CHÍNH GIỮA) */}
              <path d="M44 22H84V26H96V30H104V38H108V50H112V70H108V78H104V82H96V86H84V90H44V86H32V82H24V78H20V70H16V50H20V38H28V30H36V26H44V22Z" fill="#f19cb2" />
              <path d="M32 82H44V86H84V82H96V86H84V90H44V86H32V82Z" fill="#bc7687" opacity="0.5" />

              {/* ĐỐM BÓNG SÁNG LẤP LÁNH PHẢN CHIẾU ĐẦU BẠCH TUỘC */}
              <path d="M32 38H40V34H48V30H44V34H36V38H32V42H28V50H32V42H32Z" fill="#FFFFFF" />
              <rect x="52" y="30" width="4" height="4" fill="#FFFFFF" />
              <path d="M104 46V54H100V46H104Z" fill="#FFFFFF" />

              {/* MẮT PIXEL TRÒN LONG LANH CHỚP NHÁY */}
              <rect x="52" y="66" width="4" height="4" fill="#6a3c4a" />
              <rect x="72" y="66" width="4" height="4" fill="#6a3c4a" />
              <rect x="54" y="66" width="2" height="2" fill="#FFFFFF" />
              <rect x="74" y="66" width="2" height="2" fill="#FFFFFF" />

              {/* ĐÔI MÁ HỒNG CHÚM CHÍM CỰC YÊU */}
              <rect x="44" y="70" width="8" height="4" fill="#f77595" />
              <rect x="76" y="70" width="8" height="4" fill="#f77595" />

              {/* KHUÔN MIỆNG CHỮ "O" TRÒN TRỊA ĐANG THỔI BONG BÓNG */}
              <path d="M62 70H66V74H62V70Z" fill="#6a3c4a" />
              <rect x="63" y="71" width="2" height="2" fill="#f19cb2" />
            </svg>
          </div>

          <p className="frame-popup__eyebrow">Lựa chọn hoàn hảo ✨</p>
          <h2 className="frame-popup__title">Chốt mẫu khung siêu yêu này nha? 🖼️</h2>
          <p className="frame-popup__message">
            Bạn đã chọn được {frameTarget} chiếc khung xinh xắn rồi đó! Bé bạch tuộc đang rất háo hức được khoác tấm áo mới rực rỡ này cho những bức ảnh ngọt ngào của bạn. Cùng tiến tới bước tiếp theo nào! 🥰
          </p>
          
          {/* METER HIỂN THỊ TÊN KHUNG TRANH ĐANG CHỌN */}
          <div className="frame-popup__names">
            <Sparkles size={16} className="animate-spin" style={{ color: '#fbbf24', animationDuration: '0.9s', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              {frameNames.split('•').map((name, index) => (
                <span key={index} style={{ display: 'block' }}>{name.trim()}</span>
              ))}
            </div>
            <CheckCircle2 size={16} style={{ color: '#ff527b', flexShrink: 0 }} />
          </div>

          {/* CÁC NÚT ĐIỀU HƯỚNG */}
          <div className="frame-popup__actions">
            <button 
              type="button" 
              className="frame-popup__button frame-popup__button--ghost" 
              onClick={onCancel} 
              disabled={busy}
            >
              Lựa thêm chút nữa 👀
            </button>
            <button 
              type="button" 
              className="frame-popup__button frame-popup__button--primary" 
              onClick={onConfirm} 
              disabled={busy}
              style={busy ? {
                background: 'linear-gradient(135deg, #fcd34d 0%, #ff708d 50%, #f43f5e 100%)',
                backgroundSize: '200% auto',
                animation: 'button-rainbow-shimmer 0.9s infinite linear'
              } : {}}
            >
              {busy ? (
                <>
                  <span className="animate-spin mr-1">🎨</span>
                  Đang đóng khung…
                </>
              ) : (
                <>
                  Chốt khung xinh này thôi 💖
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </dialog>
  );
}
