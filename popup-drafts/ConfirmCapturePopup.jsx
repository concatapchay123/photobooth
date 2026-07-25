import React, { useState } from 'react';
import { Sparkles, Heart, Camera, Check, Plus, Minus } from 'lucide-react';

// ==========================================
// 1. COMPONENT "App" (MÔI TRƯỜNG PLAYGROUND ĐỂ XEM PREVIEW TRỰC TIẾP)
// ==========================================
export default function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [capturedCount, setCapturedCount] = useState(6);
  const [toast, setToast] = useState(null);

  const handleConfirm = () => {
    setBusy(true);
    showToast('📸 *Tách!* Bé Bạch Tuộc đang rửa phim siêu tốc… Chờ xíu nhe!');
    
    // Giả lập thời gian xử lý ảnh
    setTimeout(() => {
      setBusy(false);
      setIsOpen(false);
      showToast('🎉 Rửa ảnh hoàn tất! Hãy cùng chọn những chiếc khung xinh nhất nào! 🖼️🐙');
    }, 2800);
  };

  const handleCancel = () => {
    setIsOpen(false);
    showToast('📸 Cầm máy lên và tạo dáng tiếp thôi nào! Pose! ✌️🐙');
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
            radial-gradient(at 15% 15%, rgba(255, 192, 203, 0.4) 0px, transparent 40%),
            radial-gradient(at 85% 85%, rgba(186, 230, 253, 0.4) 0px, transparent 40%),
            radial-gradient(at 50% 50%, #ffffff 0%, transparent 80%);
          font-family: system-ui, -apple-system, sans-serif;
          padding: 24px;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .playground-card {
          max-width: 440px;
          background: #ffffff;
          padding: 36px 28px;
          border-radius: 36px;
          box-shadow: 
            0 12px 35px rgba(255, 82, 123, 0.12),
            0 1px 3px rgba(0, 0, 0, 0.02);
          border: 4px solid #ffe3e8;
          text-align: center;
          position: relative;
        }

        .playground-title {
          font-size: 24px;
          font-weight: 1000;
          color: #ff527b;
          margin: 0 0 8px;
        }

        .playground-desc {
          font-size: 14px;
          color: #9c6a74;
          line-height: 1.6;
          margin: 0 0 20px;
        }

        /* Bộ chỉnh số lượng ảnh test */
        .counter-tool {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
          background: #fff5f6;
          padding: 10px 16px;
          border-radius: 20px;
          border: 2px dashed #ffccd5;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }

        .counter-label {
          font-size: 13.5px;
          font-weight: 800;
          color: #8c4a57;
        }

        .counter-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #ff758c;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .counter-btn:hover {
          transform: scale(1.1);
          background: #ff527b;
        }

        .counter-value {
          font-size: 18px;
          font-weight: 1000;
          color: #ff385c;
          min-width: 24px;
        }

        .summon-btn {
          background: linear-gradient(135deg, #ff8da1 0%, #ff527b 100%);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 28px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(255, 82, 123, 0.35);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .summon-btn:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 12px 22px rgba(255, 82, 123, 0.45);
        }

        /* Toast thông báo siêu ngọt */
        .cute-toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: #ff527b;
          color: #fff;
          padding: 14px 28px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 15px 35px rgba(255, 82, 123, 0.35);
          z-index: 2000;
          animation: toast-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        @keyframes toast-slide-up {
          from { bottom: -60px; opacity: 0; }
          to { bottom: 30px; opacity: 1; }
        }
      `}</style>

      {/* Sân chơi thử nghiệm */}
      <div className="playground-card">
        <h1 className="playground-title">Mascot Camera Thủy Cung 📸🐙</h1>
        <p className="playground-desc">
          Bấm nút chụp thêm ảnh hoặc tăng giảm số lượng ảnh để kiểm tra trạng thái hiển thị của popup nhe!
        </p>
        
        <div className="counter-tool">
          <span className="counter-label">Số ảnh đã chụp:</span>
          <button type="button" className="counter-btn" onClick={() => setCapturedCount((current) => Math.max(1, current - 1))}>
            <Minus size={14} />
          </button>
          <span className="counter-value">{capturedCount}</span>
          <button type="button" className="counter-btn" onClick={() => setCapturedCount((current) => current + 1)}>
            <Plus size={14} />
          </button>
        </div>

        <button type="button" className="summon-btn" onClick={() => setIsOpen(true)}>
          Mở Popup Studio Bạch Tuộc ✨
        </button>
      </div>

      {toast && <div className="cute-toast">{toast}</div>}

      {/* HIỂN THỊ POPUP KHUNG ẢNH */}
      {isOpen && (
        <ConfirmCapturePopup
          capturedCount={capturedCount}
          busy={busy}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}


// ==========================================
// 2. COMPONENT POPUP PHIÊN BẢN CAMERA BẠCH TUỘC PIXEL
// ==========================================
export function ConfirmCapturePopup({
  capturedCount = 6,
  busy = false,
  onCancel = () => {},
  onConfirm = () => {},
} = {}) {
  return (
    <dialog
      open
      className="capture-popup-backdrop"
      aria-modal="true"
    >
      <style>{`
        /* --- BACKDROP PHÒNG LAB DÂU TÂY --- */
        .capture-popup-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: 
            radial-gradient(circle at 80% 15%, rgba(255, 182, 193, 0.45), transparent 45%),
            radial-gradient(circle at 15% 85%, rgba(186, 230, 253, 0.45), transparent 45%),
            rgba(61, 14, 28, 0.4);
          background: transparent;
          backdrop-filter: none;
          animation: capture-ocean-backdrop-in 0.3s ease-out forwards;
        }

        /* --- POPUP CHÍNH: VIỀN SỮA DÂU BỔNG BỀNH --- */
        .capture-popup {
          position: relative;
          width: min(100%, 420px);
          border: 6px solid #fff;
          border-radius: 46px;
          background: linear-gradient(135deg, #ffffff 0%, #fff3f6 55%, #e8f7ff 100%);
          color: #5c1123;
          text-align: center;
          box-shadow: 
            0 12px 0 #ffd0db,
            0 32px 65px rgba(92, 17, 35, 0.22);
          animation: capture-ocean-pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: visible;
        }

        .capture-popup__body {
          padding: 38px 28px 28px;
        }

        /* --- CHIẾC NHÃN STUDIO --- */
        .studio-ribbon {
          position: absolute;
          top: -14px;
          right: 32px;
          background: #ffe4e6;
          border: 2px solid #fecdd3;
          color: #be123c;
          padding: 4px 14px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 1000;
          box-shadow: 0 4px 10px rgba(190, 18, 60, 0.1);
          transform: rotate(4deg);
          animation: ribbon-float 0.9s infinite alternate;
        }

        /* --- MASCOT BẠCH TUỘC CẦM CAMERA SIÊU CUTE --- */
        .mascot-container {
          position: relative;
          width: 140px;
          height: 130px;
          margin: -15px auto 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: octopus-swim-camera 0.9s ease-in-out infinite;
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
        .sea-bubble--1 { width: 10px; height: 10px; left: 12px; bottom: 32px; animation-delay: 0.3s; }
        .sea-bubble--2 { width: 13px; height: 13px; right: 12px; bottom: 42px; animation-delay: 0.9s; }
        .sea-bubble--3 { width: 8px; height: 8px; left: 50%; bottom: 8px; animation-delay: 0.9s; }

        /* Chớp lấp lánh lung linh */
        .pixel-sparkle {
          position: absolute;
          color: #ffca3a;
          animation: sparkle-blink-retro 0.9s ease-in-out infinite;
        }
        .pixel-sparkle--1 { top: 12px; left: -8px; animation-delay: 0.2s; }
        .pixel-sparkle--2 { bottom: 42px; right: -8px; animation-delay: 0.9s; }

        /* --- TYPOGRAPHY ĐÁNG YÊU --- */
        .capture-popup__eyebrow {
          display: inline-block;
          margin: 0 0 10px;
          background: linear-gradient(135deg, #fff0f3 0%, #ffe3e8 100%);
          border: 1.5px solid #ffccd5;
          color: #ff527b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 20px;
        }

        .capture-popup__title {
          margin: 0;
          color: #4a0517;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .capture-popup__message {
          margin: 12px 0 0;
          color: #8c515e;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- METER: HIỂN THỊ SỐ LƯỢNG ẢNH ĐẸP --- */
        .capture-popup__meter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 22px auto 0;
          width: fit-content;
          border-radius: 24px;
          background: #ffffff;
          border: 2px dashed #ffb3c1;
          padding: 8px 18px;
          color: #ff527b;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(255, 82, 123, 0.04);
        }

        /* --- NÚT BẤM JELLY BONG BÓNG SIÊU NẨY --- */
        .capture-popup__actions {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 12px;
          margin-top: 26px;
        }

        .capture-popup__button {
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

        /* Nút Chụp Thêm (Marshmallow) */
        .capture-popup__button--ghost {
          background: #fff;
          border: 2.5px solid #ffccd5;
          color: #ff527b;
          box-shadow: 0 5px 0 #ffccd5;
        }

        .capture-popup__button--ghost:hover:not(:disabled) {
          background: #fff0f3;
          transform: translateY(-2px);
          box-shadow: 0 7px 0 #ffccd5;
          animation: button-wiggle-soft 0.5s ease-in-out;
        }

        /* Nút Chốt (Jelly Hồng Dâu) */
        .capture-popup__button--primary {
          background: linear-gradient(135deg, #ff8da1 0%, #ff527b 55%, #f43f5e 100%);
          background-size: 200% auto;
          color: #fff;
          box-shadow: 
            0 5px 0 #cd2c4f,
            0 12px 24px rgba(255, 82, 123, 0.3);
        }

        .capture-popup__button--primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 8px 0 #cd2c4f,
            0 16px 28px rgba(255, 82, 123, 0.4);
        }

        .capture-popup__button:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 1px 0 transparent;
        }

        .capture-popup__button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #ead9dc;
          box-shadow: none;
          color: #9c8488;
          border: none;
        }

        /* --- MÀN HÌNH CHỚP FLASH KHI CHUẨN BỊ CHUYỂN TRANG --- */
        .camera-flash-overlay {
          position: absolute;
          inset: 0;
          background: #ffffff;
          border-radius: 40px;
          opacity: 0;
          pointer-events: none;
          z-index: 10;
        }

        .camera-flash-active {
          animation: screen-camera-flash 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }

        /* --- CÁC HOẠT ẢNH TỰ NHIÊN (KEYFRAMES) --- */
        @keyframes capture-ocean-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes capture-ocean-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.72) translateY(38px) rotate(-2deg);
          }
          70% {
            transform: scale(1.05) translateY(-5px) rotate(1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(0deg);
          }
        }

        @keyframes ribbon-float {
          from { transform: rotate(4deg) translateY(0); }
          to { transform: rotate(8deg) translateY(-3px); }
        }

        /* Thủy quái nhỏ bơi dập dềnh */
        @keyframes octopus-swim-camera {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-7px) scaleY(1.03); }
        }

        /* Xúc tu ngoe nguẩy */
        @keyframes tentacle-move-1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg) translateY(1px); }
        }
        @keyframes tentacle-move-2 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg) translateX(-1px); }
        }
        @keyframes tentacle-move-3 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg) translateX(1px); }
        }
        @keyframes tentacle-move-4 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(10deg) translateY(-1px); }
        }

        /* Nhấp nháy đèn chụp của máy ảnh khi busy */
        @keyframes lens-active-glow {
          0%, 100% { fill: #4fb477; }
          50% { fill: #7bf1a8; filter: drop-shadow(0 0 6px #7bf1a8); }
        }

        /* Chớp lấp lánh vàng */
        @keyframes sparkle-blink-retro {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.25) rotate(90deg); opacity: 1; }
        }

        /* Sủi bọt sủi bọt bay lên */
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

        @keyframes screen-camera-flash {
          0% { opacity: 0; }
          15% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Hóa phép nhấp nháy cho nút chính khi busy */
        @keyframes button-magic-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (max-width: 480px) {
          .capture-popup__actions {
            grid-template-columns: 1fr;
          }
          .capture-popup__button--ghost {
            order: 2;
          }
        }
      `}</style>

      <section className="capture-popup">
        {/* Lớp chớp flash màn hình khi bắt đầu chốt ảnh */}
        <div className={`camera-flash-overlay ${busy ? 'camera-flash-active' : ''}`} />

        {/* Nhãn Studio xinh xẻo */}
        <div className="studio-ribbon">Studio Bạch Tuộc 🐙🎬</div>

        <div className="capture-popup__body">
          
          {/* Khu vực Mascot Bé Bạch Tuộc và Máy Ảnh */}
          <div className="mascot-container">
            <Sparkles className="pixel-sparkle pixel-sparkle--1" size={18} />
            <Sparkles className="pixel-sparkle pixel-sparkle--2" size={20} />
            
            {/* Các bọt bong bóng liên tục bay lên */}
            <div className="sea-bubble sea-bubble--1" style={{ '--b-dx': '-12px' }} />
            <div className="sea-bubble sea-bubble--2" style={{ '--b-dx': '12px' }} />
            <div className="sea-bubble sea-bubble--3" style={{ '--b-dx': '4px' }} />
            
            {/* BẢN VẼ TAY SVG 100% PIXEL ART KHỚP HOÀN HẢO THEO FILE ẢNH VỚI CHIẾC MÁY ẢNH RETRO */}
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

              {/* TENTACLE 1: Xúc tu ngoài cùng bên trái (Có đeo cuộn film nhỏ màu vàng) */}
              <g style={{ 
                transformOrigin: '48px 84px', 
                animation: 'tentacle-move-1 0.9s ease-in-out infinite' 
              }}>
                <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                {/* Cuộn phim vàng nhỏ trang trí treo ở xúc tu trái */}
                <rect x="14" y="74" width="6" height="6" fill="#ffd166" />
                <rect x="16" y="76" width="2" height="2" fill="#5c1123" />
                <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
              </g>

              {/* TENTACLE 2: Xúc tu trong bên trái */}
              <g style={{ 
                transformOrigin: '52px 86px', 
                animation: 'tentacle-move-2 0.9s ease-in-out infinite' 
              }}>
                <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />
                <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 3: Xúc tu trong bên phải (ÔM CHIẾC MÁY ẢNH PIXEL) */}
              <g style={{ 
                transformOrigin: '76px 86px', 
                animation: 'tentacle-move-3 0.9s ease-in-out infinite' 
              }}>
                <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />
                {/* Chiếc máy ảnh pixel màu Mint được bé ôm khéo léo */}
                <rect x="78" y="86" width="16" height="12" rx="2" fill="#4fb477" stroke="#5c1123" strokeWidth="1.5" />
                <rect x="82" y="83" width="4" height="3" fill="#ffca3a" />
                {/* Ống kính nhấp nháy khi đang chốt ảnh */}
                <circle 
                  cx="86" 
                  cy="92" 
                  r="3.5" 
                  fill="#ffffff" 
                  stroke="#5c1123" 
                  strokeWidth="1.5" 
                  style={busy ? { animation: 'lens-active-glow 0.35s infinite' } : {}}
                />
                <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 4: Xúc tu ngoài cùng bên phải */}
              <g style={{ 
                transformOrigin: '80px 84px', 
                animation: 'tentacle-move-4 0.9s ease-in-out infinite' 
              }}>
                <path d="M116 70H112V66H108V62H104V74H108V78H112V82H116V70Z" fill="#f19cb2" />
                <path d="M104 74H100V78H92V82H88V86H84V90H92V86H100V82H104V78H108V74H104Z" fill="#f19cb2" />
                <rect x="108" y="70" width="4" height="4" fill="#FFFFFF" />
                <rect x="96" y="78" width="8" height="4" fill="#FFFFFF" />
                <path d="M116 82H108V86H100V90H92V94H84V90H92V86H100V82H108V78H116V82Z" fill="#bc7687" opacity="0.6" />
              </g>

              {/* ĐẦU TRÒN PIXEL BỰ (CHÍNH GIỮA) */}
              <path d="M44 22H84V26H96V30H104V38H108V50H112V70H108V78H104V82H96V86H84V90H44V86H32V82H24V78H20V70H16V50H20V38H28V30H36V26H44V22Z" fill="#f19cb2" />
              <path d="M32 82H44V86H84V82H96V86H84V90H44V86H32V82Z" fill="#bc7687" opacity="0.5" />

              {/* ĐỐM BÓNG SÁNG LẤP LÁNH PHẢN CHIẾU */}
              <path d="M32 38H40V34H48V30H44V34H36V38H32V42H28V50H32V42H32Z" fill="#FFFFFF" />
              <rect x="52" y="30" width="4" height="4" fill="#FFFFFF" />
              <path d="M104 46V54H100V46H104Z" fill="#FFFFFF" />

              {/* MẮT TRÒN ĐEN PIXEL LONG LANH */}
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

          <p className="capture-popup__eyebrow">Chốt ảnh chụp</p>
          <h2 className="capture-popup__title">Qua chọn khung luôn nha? 📸</h2>
          <p className="capture-popup__message">
            Chúng mình đã có {capturedCount} tấm ảnh xinh xắn rồi đó! Bấm chốt để kết thúc buổi chụp tại đây, cho bé bạch tuộc nghỉ tay xíu rùi tụi mình qua chọn khung cute ngay nha! 🥰
          </p>
          
          {/* METER HIỂN THỊ SỐ LƯỢNG ẢNH ĐÃ CHỤP */}
          <div className="capture-popup__meter">
            <Camera size={14} className="animate-pulse" style={{ color: '#0ea5e9' }} />
            <span>Đã thu hoạch {capturedCount} ảnh xịn xò</span>
            <Check size={14} style={{ color: '#10b981' }} />
          </div>

          {/* CÁC NÚT ĐIỀU HƯỚNG */}
          <div className="capture-popup__actions">
            <button 
              type="button" 
              className="capture-popup__button capture-popup__button--ghost" 
              onClick={onCancel} 
              disabled={busy}
            >
              Chụp thêm đã 🐙
            </button>
            <button 
              type="button" 
              className="capture-popup__button capture-popup__button--primary" 
              onClick={onConfirm} 
              disabled={busy}
              style={busy ? {
                background: 'linear-gradient(135deg, #ffa8ba 0%, #ff708d 50%, #f43f5e 100%)',
                backgroundSize: '200% auto',
                animation: 'button-magic-shimmer 0.9s infinite linear'
              } : {}}
            >
              {busy ? (
                <>
                  <span className="animate-spin mr-1">🫧</span>
                  Đang chốt ảnh…
                </>
              ) : (
                <>
                  Qua chọn khung ngay 💖
                </>
              )}
            </button>
          </div>

        </div>
      </section>
    </dialog>
  );
}
