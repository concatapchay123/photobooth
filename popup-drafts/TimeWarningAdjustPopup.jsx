import React, { useState, useEffect, useRef } from 'react';
import { Clock3, Info, AlertTriangle, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';

// ==========================================
// 1. COMPONENT "App" (MÔI TRƯỜNG PLAYGROUND ĐỂ XEM PREVIEW TRỰC TIẾP TRÊN CANVAS)
// ==========================================
export default function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(28);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef(null);

  // Xử lý đếm ngược thời gian thực tế cho Playground
  useEffect(() => {
    if (isPlaying && isOpen) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, isOpen]);

  const handleReset = () => {
    setSecondsLeft(30);
    setIsPlaying(true);
    setIsOpen(true);
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
            radial-gradient(at 85% 85%, rgba(254, 240, 138, 0.4) 0px, transparent 40%),
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
            0 12px 35px rgba(124, 58, 237, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.02);
          border: 4px solid #f3e8ff;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .playground-title {
          font-size: 24px;
          font-weight: 1000;
          color: #7c3aed;
          margin: 0 0 8px;
        }

        .playground-desc {
          font-size: 14px;
          color: #6b21a8;
          line-height: 1.6;
          margin: 0 0 20px;
        }

        /* Bộ điều khiển đếm ngược */
        .playground-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
          background: #f5f3ff;
          padding: 12px 20px;
          border-radius: 24px;
          border: 2px dashed #ddd6fe;
        }

        .control-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: #7c3aed;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 10px rgba(124, 58, 237, 0.2);
        }

        .control-btn:hover {
          transform: scale(1.1);
          background: #6d28d9;
        }

        .control-btn--secondary {
          background: #ff758c;
          box-shadow: 0 4px 10px rgba(255, 117, 140, 0.2);
        }

        .control-btn--secondary:hover {
          background: #ff527b;
        }

        .timer-display {
          font-size: 18px;
          font-weight: 1000;
          color: #5b21b6;
          min-width: 140px;
          text-align: center;
        }

        .summon-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #ff527b 100%);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 28px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(124, 58, 237, 0.3);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .summon-btn:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 12px 22px rgba(124, 58, 237, 0.4);
        }
      `}</style>

      {/* Sân chơi thử nghiệm */}
      <div className="playground-card">
        <h1 className="playground-title">Báo Giờ Thủy Cung 🐙⏰</h1>
        <p className="playground-desc">
          Bấm các nút điều khiển để chạy thử đếm ngược thời gian thực tế và xem thanh tiến trình của bé Bạch tuộc phản hồi nhé!
        </p>
        
        <div className="playground-controls">
          <button type="button" className="control-btn" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          
          <span className="timer-display">
            ⏱️ {secondsLeft} giây còn lại
          </span>

          <button type="button" className="control-btn control-btn--secondary" onClick={handleReset}>
            <RotateCcw size={18} />
          </button>
        </div>

        <button type="button" className="summon-btn" onClick={() => setIsOpen(true)}>
          Mở Popup Nhắc Giờ ✨
        </button>
      </div>

      {/* HIỂN THỊ POPUP NHẮC GIỜ CHỈNH SỬA */}
      {isOpen && (
        <TimeWarningAdjustPopup
          secondsLeft={secondsLeft}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}


// ==========================================
// 2. COMPONENT POPUP PHIÊN BẢN BẠCH TUỘC KHẨN CẤP
// ==========================================
const getFriendlyTimeText = (secondsLeft) => {
  const roundedSeconds = Math.ceil(secondsLeft);
  return roundedSeconds > 0 ? `còn khoảng ${roundedSeconds} giây` : 'đã tới mốc thời gian';
};

export function TimeWarningAdjustPopup({ secondsLeft = 28, onClose = () => {} } = {}) {
  const timeText = getFriendlyTimeText(secondsLeft);
  
  // Tính toán phần trăm thanh chạy dựa trên mốc tối đa 30 giây
  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / 30) * 100));

  return (
    <dialog
      open
      className="adjust-warning-backdrop"
      role="alertdialog"
      aria-modal="true"
    >
      <style>{`
        /* --- BACKDROP ĐẠI DƯƠNG SỮA TÍM --- */
        .adjust-warning-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: 
            radial-gradient(circle at 80% 80%, rgba(196, 181, 253, 0.45), transparent 45%),
            radial-gradient(circle at 20% 20%, rgba(255, 182, 193, 0.45), transparent 45%),
            rgba(56, 15, 33, 0.42);
          background: transparent;
          backdrop-filter: none;
          animation: warning-ocean-backdrop-in 0.3s ease-out forwards;
        }

        /* --- POPUP CHÍNH: KHUNG VIỀN ĐÁM MÂY TRÒN TRỊA --- */
        .adjust-warning {
          position: relative;
          width: min(100%, 410px);
          overflow: hidden;
          border: 6px solid #fff;
          border-radius: 46px;
          background: linear-gradient(135deg, #ffffff 0%, #fffcf5 50%, #faf5ff 100%);
          color: #57112d;
          text-align: center;
          box-shadow: 
            0 12px 0 #e8dbf8,
            0 32px 70px rgba(87, 17, 45, 0.22);
          animation: warning-ocean-pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* --- THANH COUNTDOWN CO DÃN SIÊU CUTE --- */
        .adjust-warning__bar-container {
          height: 12px;
          background: #f3e8ff;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .adjust-warning__bar {
          height: 100%;
          background: linear-gradient(90deg, #ffca3a, #ff758c, #7c3aed);
          border-radius: 0 6px 6px 0;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(255, 117, 140, 0.2);
        }

        .adjust-warning__body {
          padding: 34px 26px 28px;
        }

        /* --- NHÃN RUY BĂNG CẢNH BÁO --- */
        .warning-ribbon {
          position: absolute;
          top: -14px;
          left: 32px;
          background: #ffe4e6;
          border: 2px solid #fecdd3;
          color: #e11d48;
          padding: 4px 14px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 1000;
          box-shadow: 0 4px 10px rgba(225, 29, 72, 0.08);
          transform: rotate(-3deg);
          animation: warning-ribbon-float 0.9s infinite alternate;
        }

        /* Nút Đóng nhỏ màu hồng phấn */
        .warning-close-btn {
          position: absolute;
          top: 18px;
          right: 22px;
          background: #fff5f6;
          border: 2px solid #ffccd5;
          color: #ff527b;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 1000;
          cursor: pointer;
          transition: all 0.2s;
        }

        .warning-close-btn:hover {
          transform: scale(1.1) rotate(90deg);
          background: #ffccd5;
        }

        /* --- MASCOT BẠCH TUỘC HOẢNG HỐT --- */
        .mascot-container {
          position: relative;
          width: 140px;
          height: 130px;
          margin: -10px auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: warning-octopus-float 0.9s ease-in-out infinite;
        }

        /* Bong bóng sủi tăm liên tục bay lên */
        .sea-bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.85);
          border: 1.5px solid #ffccd5;
          border-radius: 50%;
          animation: warning-bubble-rise 0.9s infinite linear;
          opacity: 0;
          pointer-events: none;
        }
        .sea-bubble--1 { width: 10px; height: 10px; left: 12px; bottom: 30px; animation-delay: 0.3s; }
        .sea-bubble--2 { width: 14px; height: 14px; right: 12px; bottom: 42px; animation-delay: 0.9s; }
        .sea-bubble--3 { width: 8px; height: 8px; left: 52%; bottom: 6px; animation-delay: 0.9s; }

        /* Tia sáng lấp lánh pixel */
        .pixel-sparkle {
          position: absolute;
          color: #ffca3a;
          animation: warning-sparkle-spin 0.9s ease-in-out infinite;
        }
        .pixel-sparkle--1 { top: 10px; left: -10px; animation-delay: 0.2s; }
        .pixel-sparkle--2 { bottom: 40px; right: -12px; animation-delay: 0.9s; }

        /* --- TYPOGRAPHY ĐÁNG YÊU --- */
        .adjust-warning__eyebrow {
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

        .adjust-warning__title {
          margin: 0;
          color: #4a0517;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .adjust-warning__message {
          margin: 12px 0 0;
          color: #8c515e;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- KHUNG GHI CHÚ ĐỒNG HỒ CÁT --- */
        .adjust-warning__note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 22px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 2px dashed #ddd6fe;
          padding: 10px 18px;
          color: #7c3aed;
          font-size: 12.5px;
          font-weight: 900;
          line-height: 1.4;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.04);
        }

        /* Giọt mồ hôi lo lắng nẩy tưng tưng */
        @keyframes sweat-drop-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-2px, 3px) scale(1.15); }
        }

        /* --- CÁC HOẠT ẢNH TỰ NHIÊN (KEYFRAMES) --- */
        @keyframes warning-ocean-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes warning-ocean-pop-in {
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

        @keyframes warning-ribbon-float {
          from { transform: rotate(-3deg) translateY(0); }
          to { transform: rotate(-6deg) translateY(-3px); }
        }

        /* Bạch tuộc bơi bồng bềnh hơi bồn chồn */
        @keyframes warning-octopus-float {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-6px) scaleY(1.04); }
        }

        /* Các xúc tu đập liên tục báo giờ */
        @keyframes warning-tentacle-1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-12deg) translateY(1px); }
        }
        @keyframes warning-tentacle-2 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(10deg) translateX(-1px); }
        }
        @keyframes warning-tentacle-3 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg) translateX(1px); }
        }
        @keyframes warning-tentacle-4 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(14deg) translateY(-1px); }
        }

        /* Hạt cát rơi trong đồng hồ */
        @keyframes sand-falling {
          0% { opacity: 0.3; transform: translateY(-4px); }
          50% { opacity: 1; }
          100% { opacity: 0.3; transform: translateY(4px); }
        }

        @keyframes warning-sparkle-spin {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
        }

        @keyframes warning-bubble-rise {
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
      `}</style>

      <section className="adjust-warning">
        {/* Thanh countdown năng động giảm dần */}
        <div className="adjust-warning__bar-container">
          <div className="adjust-warning__bar" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Nút tắt khẩn cấp */}
        <button type="button" className="warning-close-btn" onClick={onClose}>×</button>

        {/* Nhãn ruy băng cảnh báo thủy cung */}
        <div className="warning-ribbon">Nhắc Nhỏ Dễ Thương 🫧⏱️</div>

        <div className="adjust-warning__body">
          
          {/* Khu vực Mascot Bé Bạch Tuộc hốt hoảng ôm đồng hồ cát */}
          <div className="mascot-container">
            <Sparkles className="pixel-sparkle pixel-sparkle--1" size={18} />
            <Sparkles className="pixel-sparkle pixel-sparkle--2" size={20} />
            
            {/* Bong bóng nổi bọt */}
            <div className="sea-bubble sea-bubble--1" style={{ '--b-dx': '-12px' }} />
            <div className="sea-bubble sea-bubble--2" style={{ '--b-dx': '12px' }} />
            <div className="sea-bubble sea-bubble--3" style={{ '--b-dx': '4px' }} />
            
            {/* BẢN VẼ TAY SVG 100% PIXEL ART BẠCH TUỘC HOẢNG HỐT KHỚP THEO FILE ẢNH */}
            <svg 
              width="115" 
              height="115" 
              viewBox="0 0 128 128" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ shapeRendering: 'crispEdges' }}
            >
              {/* Bóng chân */}
              <ellipse cx="64" cy="115" rx="20" ry="3" fill="#ffb7c5" opacity="0.4" />

              {/* TENTACLE 1: Xúc tu ngoài cùng bên trái */}
              <g style={{ 
                transformOrigin: '48px 84px', 
                animation: 'warning-tentacle-1 0.9s ease-in-out infinite' 
              }}>
                <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
              </g>

              {/* TENTACLE 2: Xúc tu trong bên trái (Ôm đồng hồ cát cổ điển) */}
              <g style={{ 
                transformOrigin: '52px 86px', 
                animation: 'warning-tentacle-2 0.9s ease-in-out infinite' 
              }}>
                <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />

                {/* ĐỒNG HỒ CÁT PIXEL RETRO TRÊN XÚC TU TRÁI */}
                <g style={{ transform: 'translate(-10px, 4px)' }}>
                  {/* Khung gỗ */}
                  <rect x="30" y="80" width="14" height="18" fill="#ffca3a" stroke="#5c112d" strokeWidth="1.5" />
                  {/* Thủy tinh bên trong */}
                  <path d="M32 82H42V84L39 88L42 92V96H32V92L35 88L32 84V82Z" fill="#e0f2fe" />
                  {/* Cát hồng đang chảy xuống */}
                  <rect x="35" y="83" width="4" height="2" fill="#ff758c" />
                  <rect x="35" y="93" width="4" height="3" fill="#ff758c" />
                  <circle cx="37" cy="88" r="1" fill="#ff758c" style={{ animation: 'sand-falling 0.6s infinite linear' }} />
                </g>

                <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 3: Xúc tu trong bên phải (Ôm chiếc đồng hồ bỏ túi pixel) */}
              <g style={{ 
                transformOrigin: '76px 86px', 
                animation: 'warning-tentacle-3 0.9s ease-in-out infinite' 
              }}>
                <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />

                {/* ĐỒNG HỒ BỎ TÚI TRÊN XÚC TU PHẢI */}
                <g style={{ transform: 'translate(10px, 4px)' }}>
                  <circle cx="88" cy="89" r="7" fill="#ffd166" stroke="#5c112d" strokeWidth="1.5" />
                  <circle cx="88" cy="89" r="4.5" fill="#ffffff" />
                  {/* Kim đồng hồ pixel */}
                  <path d="M88 86V89H91" stroke="#ff527b" strokeWidth="1" strokeLinecap="round" />
                </g>

                <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
              </g>

              {/* TENTACLE 4: Xúc tu ngoài cùng bên phải */}
              <g style={{ 
                transformOrigin: '80px 84px', 
                animation: 'warning-tentacle-4 0.9s ease-in-out infinite' 
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

              {/* ĐỐM BÓNG PHẢN CHIẾU SÁNG TRÊN ĐẦU */}
              <path d="M32 38H40V34H48V30H44V34H36V38H32V42H28V50H32V42H32Z" fill="#FFFFFF" />
              <rect x="52" y="30" width="4" height="4" fill="#FFFFFF" />
              <path d="M104 46V54H100V46H104Z" fill="#FFFFFF" />

              {/* GIỌT MỒ HÔI LO LẮNG NẨY TƯNG TƯNG TRÊN TRÁN BẠCH TUỘC */}
              <g style={{ animation: 'sweat-drop-drift 0.9s infinite ease-in-out' }}>
                <path d="M30 46L32 44H34V48L32 50H30V46Z" fill="#38bdf8" />
                <rect x="32" y="45" width="1" height="1" fill="#ffffff" />
              </g>

              {/* ĐÔI MẮT MỞ TO HƠN MỘT TÍ (Vẻ bối rối bối rối) */}
              <rect x="52" y="66" width="4" height="4" fill="#6a3c4a" />
              <rect x="72" y="66" width="4" height="4" fill="#6a3c4a" />
              {/* Điểm long lanh hốt hoảng */}
              <rect x="53" y="67" width="2" height="2" fill="#FFFFFF" />
              <rect x="73" y="67" width="2" height="2" fill="#FFFFFF" />

              {/* MÁ HỒNG CHÚM CHÍM CỰC CUTE */}
              <rect x="44" y="70" width="8" height="4" fill="#f77595" />
              <rect x="76" y="70" width="8" height="4" fill="#f77595" />

              {/* MIỆNG HƠI MÉO HOẶC LÀN SÓNG (Lo lắng chút xíu nà) */}
              <path d="M60 72C61 71 63 71 64 72C65 73 67 73 68 72" stroke="#6a3c4a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <p className="adjust-warning__eyebrow">Nhắc nhẹ nè ✨</p>
          <h2 className="adjust-warning__title">Sắp hết giờ rồi nè! ⏰</h2>
          <p className="adjust-warning__message">
            Cố lên bạn ơi, mình {timeText} để hoàn tất. Hãy nhanh tay thêm các bộ lọc màu thật xinh, rồi chốt liền để nhận ảnh xịn xò nha! 🐙✨
          </p>
          
          {/* GHI CHÚ ĐỒNG HỒ CÁT DỄ THƯƠNG */}
          <div className="adjust-warning__note">
            <Clock3 size={15} className="animate-spin" style={{ animationDuration: '0.9s', color: '#7c3aed' }} />
            <span>Đồng hồ đã tạm dừng 5 giây để bạn đọc thong thả nhe!</span>
            <Info size={15} style={{ color: '#ff527b' }} />
          </div>

        </div>
      </section>
    </dialog>
  );
}
