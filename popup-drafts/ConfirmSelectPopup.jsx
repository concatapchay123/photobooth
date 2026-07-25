import React, { useState } from 'react';
import { Sparkles, Heart, ImagePlus, CheckCircle2, Plus, Minus, AlertCircle } from 'lucide-react';

// ==========================================
// 1. COMPONENT "App" (MÔI TRƯỜNG PLAYGROUND ĐỂ XEM PREVIEW TRỰC TIẾP TRÊN CANVAS)
// ==========================================
export default function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedCount, setSelectedCount] = useState(4);
  const [toast, setToast] = useState(null);
  const requiredCount = 4;

  const missingCount = Math.max(0, requiredCount - selectedCount);

  const handleConfirm = () => {
    setBusy(true);
    showToast('🫧 Bé Bạch Tuộc đang xếp ảnh gọn gàng… Đợi xíu nhe!');
    
    // Giả lập xử lý chốt ảnh chuyển bước
    setTimeout(() => {
      setBusy(false);
      setIsOpen(false);
      showToast('🎉 Chốt ảnh thành công! Qua căn chỉnh thui nào! 😍📸');
    }, 2800);
  };

  const handleCancel = () => {
    setIsOpen(false);
    showToast('🐙 Bạch Tuộc ngoáy đuôi: Chọn lại những tấm ưng ý nhất nha!');
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
            radial-gradient(at 15% 15%, rgba(186, 230, 253, 0.45) 0px, transparent 40%),
            radial-gradient(at 85% 85%, rgba(255, 192, 203, 0.45) 0px, transparent 40%),
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
            0 12px 35px rgba(14, 165, 233, 0.1),
            0 1px 3px rgba(0, 0, 0, 0.02);
          border: 4px solid #e0f2fe;
          text-align: center;
          position: relative;
        }

        .playground-title {
          font-size: 24px;
          font-weight: 1000;
          color: #0284c7;
          margin: 0 0 8px;
        }

        .playground-desc {
          font-size: 14px;
          color: #0369a1;
          line-height: 1.6;
          margin: 0 0 20px;
        }

        /* Bộ chỉnh mẫu thử nghiệm trên Playground */
        .playground-tools {
          background: #f0f9ff;
          padding: 16px;
          border-radius: 24px;
          border: 2px dashed #bae6fd;
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
          font-size: 13.5px;
          font-weight: 800;
          color: #075985;
        }

        .counter-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .counter-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #38bdf8;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.15s;
        }

        .counter-btn:hover {
          transform: scale(1.1);
          background: #0284c7;
        }

        .counter-val {
          font-size: 18px;
          font-weight: 1000;
          color: #0369a1;
          min-width: 24px;
        }

        .summon-btn {
          background: linear-gradient(135deg, #38bdf8 0%, #ff527b 100%);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 28px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(56, 189, 248, 0.35);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .summon-btn:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 12px 22px rgba(56, 189, 248, 0.45);
        }

        /* Toast thông báo dễ thương */
        .cute-toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: #075985;
          color: #fff;
          padding: 14px 28px;
          border-radius: 50px;
          font-size: 13.5px;
          font-weight: 800;
          box-shadow: 0 15px 35px rgba(3, 105, 161, 0.35);
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
        <h1 className="playground-title">Album Thủy Cung Cute 📸🐙</h1>
        <p className="playground-desc">
          Bấm thay đổi số lượng ảnh đã chọn bên dưới để test thử trường hợp <b>"Đã đủ ảnh"</b> hoặc <b>"Bị thiếu ảnh"</b> nhé!
        </p>
        
        <div className="playground-tools">
          <div className="tool-row">
            <span className="tool-label">Số ảnh chọn (Tối đa {requiredCount}):</span>
            <div className="counter-wrap">
              <button type="button" className="counter-btn" onClick={() => setSelectedCount(Math.max(1, selectedCount - 1))}>
                <Minus size={14} />
              </button>
              <span className="counter-val">{selectedCount}</span>
              <button type="button" className="counter-btn" onClick={() => setSelectedCount(Math.min(4, selectedCount + 1))}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <button type="button" className="summon-btn" onClick={() => setIsOpen(true)}>
          Mở Popup Chốt Chọn Ảnh ✨
        </button>
      </div>

      {toast && <div className="cute-toast">🫧 {toast}</div>}

      {/* HIỂN THỊ POPUP CHỐT CHỌN ẢNH */}
      {isOpen && (
        <ConfirmSelectPopup
          selectedCount={selectedCount}
          requiredCount={requiredCount}
          missingCount={missingCount}
          busy={busy}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}



// ==========================================
// 2. COMPONENT POPUP PHIÊN BẢN BẠCH TUỘC CHỌN ẢNH PIXEL
// ==========================================

export function ConfirmSelectPopup({
  selectedCount = 4,
  requiredCount = 4,
  missingCount = 0,
  busy = false,
  onCancel = () => {},
  onConfirm = () => {},
} = {}) {
  const message = missingCount > 0
    ? `Bạn đã chọn được ${selectedCount}/${requiredCount} tấm rồi nè! Còn ${missingCount} ô trống còn lại bé bạch tuộc sẽ tự động nhân bản những bức ảnh siêu xinh của bạn vào cho đủ bộ luôn nha. Cùng đi tiếp thui nào! 💖`
    : `Bạn đã chọn đủ ${selectedCount}/${requiredCount} tấm ảnh thật ưng ý rồi đó! Chốt xong là chúng mình cùng qua bước làm đẹp cuối cùng để chuẩn bị in ảnh xinh ngay nha! 🥰`;

  return (
    <dialog
      open
      className="select-popup-backdrop"
      aria-modal="true"
    >
      <style>{`
        /* --- BACKDROP ĐẠI DƯƠNG XANH MINT DỊU NGỌT --- */
        .select-popup-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: 
            radial-gradient(circle at 20% 80%, rgba(186, 230, 253, 0.45), transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(255, 182, 193, 0.45), transparent 45%),
            rgba(18, 50, 74, 0.4);
          background: transparent;
          backdrop-filter: none;
          animation: select-ocean-backdrop-in 0.3s ease-out forwards;
        }

        /* --- POPUP CHÍNH: BỒNG BỀNH NHƯ ĐÁM MÂY --- */
        .select-popup {
          position: relative;
          width: min(100%, 420px);
          border: 6px solid #fff;
          border-radius: 46px;
          background: linear-gradient(135deg, #ffffff 0%, #eefaff 55%, #fff0f3 100%);
          color: #113f57;
          text-align: center;
          box-shadow: 
            0 12px 0 #bae6fd,
            0 32px 65px rgba(17, 63, 87, 0.2);
          animation: select-ocean-pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: visible;
        }

        .select-popup__body {
          padding: 38px 26px 28px;
        }

        /* --- NHÃN RUY BĂNG CUTE --- */
        .select-ribbon {
          position: absolute;
          top: -14px;
          left: 32px;
          background: #e0f2fe;
          border: 2px solid #bae6fd;
          color: #0369a1;
          padding: 4px 14px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 1000;
          box-shadow: 0 4px 10px rgba(3, 105, 161, 0.08);
          transform: rotate(-3deg);
          animation: select-ribbon-float 0.9s infinite alternate;
        }

        /* --- MASCOT BẠCH TUỘC KHÉO CHỌN ẢNH --- */
        .mascot-container {
          position: relative;
          width: 140px;
          height: 130px;
          margin: -15px auto 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: select-octopus-swim 0.9s ease-in-out infinite;
        }

        /* Bong bóng sủi tăm khi bơi */
        .sea-bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.85);
          border: 1.5px solid #ffccd5;
          border-radius: 50%;
          animation: select-bubble-float-up 0.9s infinite linear;
          opacity: 0;
          pointer-events: none;
        }
        .sea-bubble--1 { width: 10px; height: 10px; left: 10px; bottom: 32px; animation-delay: 0.3s; }
        .sea-bubble--2 { width: 13px; height: 13px; right: 10px; bottom: 44px; animation-delay: 0.9s; }
        .sea-bubble--3 { width: 8px; height: 8px; left: 52%; bottom: 6px; animation-delay: 0.9s; }

        /* Ngôi sao lấp lánh retro pixel */
        .pixel-sparkle {
          position: absolute;
          color: #ffca3a;
          animation: select-sparkle-blink 0.9s ease-in-out infinite;
        }
        .pixel-sparkle--1 { top: 12px; left: -8px; animation-delay: 0.2s; }
        .pixel-sparkle--2 { bottom: 42px; right: -8px; animation-delay: 0.9s; }

        /* --- TYPOGRAPHY ĐÁNG YÊU --- */
        .select-popup__eyebrow {
          display: inline-block;
          margin: 0 0 10px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1.5px solid #bae6fd;
          color: #0284c7;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 20px;
        }

        .select-popup__title {
          margin: 0;
          color: #03486a;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .select-popup__message {
          margin: 12px 0 0;
          color: #4b6a7a;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- STATUS BAR: HIỂN THỊ TRẠNG THÁI CHỌN ẢNH --- */
        .select-popup__status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 22px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 2px dashed #ffb3c1;
          padding: 10px 18px;
          color: #e11d48;
          font-size: 12.5px;
          font-weight: 900;
          line-height: 1.4;
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.04);
        }

        .select-popup__status--warning {
          border-color: #fca5a5;
          color: #b91c1c;
          background: #fffefc;
        }

        /* --- NÚT BẤM JELLY BONG BÓNG SIÊU NẨY --- */
        .select-popup__actions {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 12px;
          margin-top: 26px;
        }

        .select-popup__button {
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
        .select-popup__button--ghost {
          background: #fff;
          border: 2.5px solid #ffccd5;
          color: #ff527b;
          box-shadow: 0 5px 0 #ffccd5;
        }

        .select-popup__button--ghost:hover:not(:disabled) {
          background: #fff0f3;
          transform: translateY(-2px);
          box-shadow: 0 7px 0 #ffccd5;
          animation: select-button-wiggle 0.5s ease-in-out;
        }

        /* Nút Chốt (Jelly Hồng Dâu Trái Cây) */
        .select-popup__button--primary {
          background: linear-gradient(135deg, #38bdf8 0%, #ff527b 55%, #f43f5e 100%);
          background-size: 200% auto;
          color: #fff;
          box-shadow: 
            0 5px 0 #0284c7,
            0 12px 24px rgba(56, 189, 248, 0.24);
        }

        .select-popup__button--primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 8px 0 #0284c7,
            0 16px 28px rgba(56, 189, 248, 0.35);
        }

        .select-popup__button:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 1px 0 transparent;
        }

        .select-popup__button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #ead9dc;
          box-shadow: none;
          color: #9c8488;
          border: none;
        }

        /* --- CÁC HOẠT ẢNH TỰ NHIÊN (KEYFRAMES) --- */
        @keyframes select-ocean-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes select-ocean-pop-in {
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

        @keyframes select-ribbon-float {
          from { transform: rotate(-3deg) translateY(0); }
          to { transform: rotate(-6deg) translateY(-3px); }
        }

        /* Bé bạch tuộc dập dềnh bơi lội */
        @keyframes select-octopus-swim {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-7px) scaleY(1.03); }
        }

        /* Các xúc tu giữ chặt những tấm ảnh mini */
        @keyframes select-tentacle-1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg) translateY(2px); }
        }
        @keyframes select-tentacle-2 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg) translateX(-1px); }
        }
        @keyframes select-tentacle-3 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg) translateX(1px); }
        }
        @keyframes select-tentacle-4 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(12deg) translateY(-2px); }
        }

        /* Hiệu ứng rung rinh cho bức ảnh treo trên xúc tu */
        @keyframes photo-gently-sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(8deg); }
        }

        @keyframes select-sparkle-blink {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.25) rotate(90deg); opacity: 1; }
        }

        @keyframes select-bubble-float-up {
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

        @keyframes select-button-wiggle {
          0%, 100% { transform: rotate(0deg) translateY(-2px); }
          30% { transform: rotate(-3deg) translateY(-2px); }
          70% { transform: rotate(3deg) translateY(-2px); }
        }

        /* Hiệu ứng loading cầu vồng khi đang chốt ảnh */
        @keyframes select-rainbow-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (max-width: 480px) {
          .select-popup__actions {
            grid-template-columns: 1fr;
          }
          .select-popup__button--ghost {
            order: 2;
          }
        }
      `}</style>

      <section className="select-popup">
        {/* Nhãn ruy băng trang trí */}
        <div className="select-ribbon">Sưu Tập Ảnh Thủy Cung 🫧📸</div>

        <div className="select-popup__body">
          
          {/* Khu vực Mascot Bé Bạch Tuộc và các Polaroid mini */}
          <div className="mascot-container">
            <Sparkles className="pixel-sparkle pixel-sparkle--1" size={18} />
            <Sparkles className="pixel-sparkle pixel-sparkle--2" size={20} />
            
            {/* Các bọt bong bóng liên tục sủi lên */}
            <div className="sea-bubble sea-bubble--1" style={{ '--b-dx': '-12px' }} />
            <div className="sea-bubble sea-bubble--2" style={{ '--b-dx': '12px' }} />
            <div className="sea-bubble sea-bubble--3" style={{ '--b-dx': '4px' }} />
            
            {/* BẢN VẼ TAY SVG 100% PIXEL ART KHỚP HOÀN HẢO THEO FILE ẢNH VỚI NHỮNG TẤM ẢNH MINI */}
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

              {/* TENTACLE 1: Xúc tu ngoài cùng bên trái */}
              <g style={{ 
                transformOrigin: '48px 84px', 
                animation: 'select-tentacle-1 0.9s ease-in-out infinite' 
              }}>
                <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
              </g>

              {/* TENTACLE 2: Xúc tu trong bên trái (Nâng tấm ảnh trái tim nhỏ xinh) */}
              <g style={{ 
                transformOrigin: '52px 86px', 
                animation: 'select-tentacle-2 0.9s ease-in-out infinite' 
              }}>
                <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />
                
                {/* TẤM ẢNH POLAROID MINI TREO TRÊN XÚC TU TRÁI */}
                <g style={{ 
                  transformOrigin: '36px 88px', 
                  animation: 'photo-gently-sway 0.9s ease-in-out infinite' 
                }}>
                  <rect x="26" y="82" width="16" height="20" rx="1.5" fill="#FFFFFF" stroke="#5c1123" strokeWidth="1.5" />
                  <rect x="29" y="85" width="10" height="11" fill="#ffccd5" />
                  {/* Trái tim hồng dâu nhỏ xíu bên trong bức ảnh */}
                  <path d="M32 89C32 88.2 33 87.5 34 88C35 87.5 36 88.2 36 89C36 90.5 34 92 34 92C34 92 32 90.5 32 89Z" fill="#ff527b" />
                </g>

                <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 3: Xúc tu trong bên phải (Nâng tấm ảnh mặt trời mộng mơ) */}
              <g style={{ 
                transformOrigin: '76px 86px', 
                animation: 'select-tentacle-3 0.9s ease-in-out infinite' 
              }}>
                <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />
                
                {/* TẤM ẢNH POLAROID MINI TREO TRÊN XÚC TU PHẢI */}
                <g style={{ 
                  transformOrigin: '88px 88px', 
                  animation: 'photo-gently-sway 0.9s ease-in-out infinite alternate' 
                }}>
                  <rect x="82" y="82" width="16" height="20" rx="1.5" fill="#FFFFFF" stroke="#5c1123" strokeWidth="1.5" />
                  <rect x="85" y="85" width="10" height="11" fill="#e0f2fe" />
                  {/* Mặt trời vàng tí hon */}
                  <circle cx="90" cy="90" r="2.5" fill="#ffd166" />
                </g>

                <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 4: Xúc tu ngoài cùng bên phải */}
              <g style={{ 
                transformOrigin: '80px 84px', 
                animation: 'select-tentacle-4 0.9s ease-in-out infinite' 
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

          <p className="select-popup__eyebrow">Chốt chọn ảnh</p>
          <h2 className="select-popup__title">Bộ ảnh này lên khung nha? 🐙</h2>
          <p className="select-popup__message">{message}</p>
          
          {/* TRẠNG THÁI STATUS: CHỐT ĐỦ HOẶC THIẾU SLOT */}
          {missingCount > 0 ? (
            <div className="select-popup__status select-popup__status--warning">
              <AlertCircle size={15} className="animate-pulse" />
              <span>Chưa đủ ảnh nè! Thiếu {missingCount} slot trống</span>
            </div>
          ) : (
            <div className="select-popup__status">
              <Sparkles size={15} className="animate-spin" style={{ animationDuration: '0.9s' }} />
              <span>{selectedCount}/{requiredCount} ảnh đã sẵn sàng</span>
              <CheckCircle2 size={15} />
            </div>
          )}

          {/* CÁC NÚT ĐIỀU HƯỚNG */}
          <div className="select-popup__actions">
            <button 
              type="button" 
              className="select-popup__button select-popup__button--ghost" 
              onClick={onCancel} 
              disabled={busy}
            >
              Đổi vài tấm đã 👀
            </button>
            <button 
              type="button" 
              className="select-popup__button select-popup__button--primary" 
              onClick={onConfirm} 
              disabled={busy}
              style={busy ? {
                background: 'linear-gradient(135deg, #a5f3fc 0%, #38bdf8 50%, #ff527b 100%)',
                backgroundSize: '200% auto',
                animation: 'select-rainbow-shimmer 0.9s infinite linear'
              } : {}}
            >
              {busy ? (
                <>
                  <span className="animate-spin mr-1">🫧</span>
                  Đang gom ảnh…
                </>
              ) : (
                <>
                  Chốt bộ ảnh ngay ✨
                </>
              )}
            </button>
          </div>

        </div>
      </section>
    </dialog>
  );
}
