import React, { useState, useEffect } from 'react';
import { Clock3, Info, Sparkles, Play, Pause, RotateCcw, Plus, Minus, ImagePlus } from 'lucide-react';

// Hàm helper chuyển đổi giây thành văn bản dễ thương
const getFriendlyTimeText = (secondsLeft) => {
  const roundedSeconds = Math.ceil(secondsLeft);
  return roundedSeconds > 0 ? `còn khoảng ${roundedSeconds} giây` : 'đã tới mốc thời gian';
};

// =========================================================================
// COMPONENT CHÍNH (Vừa làm App preview trên Canvas, vừa là Popup chính trong dự án của bạn)
// =========================================================================
export default function App({ 
  secondsLeft: propSecondsLeft, 
  selectedCount: propSelectedCount, 
  requiredCount = 4,
  onClose 
} = {}) {
  // Kiểm tra xem component đang được chạy độc lập trên Canvas (không có prop truyền vào)
  const isStandalone = propSecondsLeft === undefined;

  // State đếm ngược và số lượng ảnh nội bộ phục vụ cho việc Preview trực tiếp trên Canvas
  const [localSeconds, setLocalSeconds] = useState(16);
  const [localSelectedCount, setLocalSelectedCount] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  // Chọn nguồn dữ liệu dựa trên môi trường chạy
  const secondsLeft = isStandalone ? localSeconds : propSecondsLeft;
  const selectedCount = isStandalone ? localSelectedCount : propSelectedCount;
  
  const timeText = getFriendlyTimeText(secondsLeft);
  const missingCount = Math.max(0, requiredCount - selectedCount);

  // Thông báo linh hoạt theo số lượng ảnh đã chọn
  const message = missingCount > 0
    ? `Nhắc yêu một chút, mình ${timeText} để chọn ảnh nè. Bạn đã chọn được ${selectedCount}/${requiredCount} tấm rồi đó; nếu thiếu slot bé bạch tuộc sẽ tự động nhân bản ảnh để bù vào cho đủ bộ lung linh nha. 🐙🍓`
    : `Nhắc yêu một chút, mình ${timeText} để chọn ảnh nè. Bạn đã chọn đủ ${selectedCount}/${requiredCount} tấm cực kỳ xuất sắc rồi! Nhanh tay chốt để chúng mình cùng đi làm đẹp ảnh nhe. ✨💖`;

  // Tính toán phần trăm thanh tiến trình (mốc thời gian tham chiếu tối đa là 30 giây)
  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / 30) * 100));

  // Tự động đếm ngược thời gian thực khi chạy độc lập (Standalone Preview)
  useEffect(() => {
    if (!isStandalone || !isPlaying) return;

    const timer = setInterval(() => {
      setLocalSeconds((prev) => {
        if (prev <= 1) {
          return 20; // Tự động lặp lại đếm ngược cho trải nghiệm xem trước mượt mà
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStandalone, isPlaying]);

  // Xử lý nút Reset nội bộ
  const handleReset = () => {
    setLocalSeconds(16);
    setLocalSelectedCount(1);
    setIsPlaying(true);
  };

  // Kích hoạt sự kiện đóng popup
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      console.log("Popup đóng!");
    }
  };

  return (
    <dialog
      open
      className="select-warning-backdrop"
      role="alertdialog"
      aria-modal="true"
    >
      <style>{`
        /* --- BACKDROP ĐẠI DƯƠNG SỮA MINT --- */
        .select-warning-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 24px;
          background: 
            radial-gradient(circle at 20% 80%, rgba(186, 230, 253, 0.45), transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(255, 182, 193, 0.45), transparent 45%),
            rgba(18, 50, 74, 0.4);
          background: transparent;
          backdrop-filter: none;
          animation: select-warning-backdrop-in 0.3s ease-out forwards;
          font-family: system-ui, -apple-system, sans-serif;
        }

        /* --- POPUP CHÍNH: LỚP BÊN NGOÀI (BẢO TOÀN RUY BĂNG VÀ NÚT ĐÓNG KHÔNG BỊ CẮT) --- */
        .select-warning {
          position: relative;
          width: min(100%, 410px);
          overflow: visible; /* Giúp dải ruy băng và nút đóng nổi lên trên viền */
          border: 6px solid #fff;
          border-radius: 46px; /* Bo góc múp míp */
          background: #fff;
          box-shadow: 
            0 12px 0 #bae6fd,
            0 32px 70px rgba(17, 63, 87, 0.22);
          animation: select-warning-pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* --- KHUNG CHỨA BÊN TRONG: CHẶN TRÀN MÀU THANH PROGRESS HOÀN HẢO --- */
        .select-warning__inner {
          width: 100%;
          height: 100%;
          overflow: hidden; /* Cắt gọn gàng thanh tiến trình theo đúng độ cong 40px của lòng trong */
          border-radius: 40px; /* Khớp tỉ lệ hoàn hảo với 46px viền ngoài trừ đi 6px độ dày viền */
          background: linear-gradient(135deg, #ffffff 0%, #eefaff 50%, #fff0f3 100%);
          display: flex;
          flex-direction: column;
        }

        /* --- THANH COUNTDOWN CO DÃN SIÊU CUTE --- */
        .select-warning__bar-container {
          height: 12px;
          background: #e0f2fe;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .select-warning__bar {
          height: 100%;
          background: linear-gradient(90deg, #0ea5e9, #ff758c, #0284c7);
          border-radius: 0 6px 6px 0;
          transition: width 0.9s linear; /* Trôi chảy mượt mà từng giây một */
          box-shadow: 0 2px 6px rgba(14, 165, 233, 0.2);
        }

        .select-warning__body {
          padding: 34px 26px 28px;
        }

        /* --- NHÃN RUY BĂNG CẢNH BÁO --- */
        .warning-ribbon {
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
          animation: warning-ribbon-float 0.9s infinite alternate;
          z-index: 10;
        }

        /* Nút Đóng nhỏ màu vàng sữa */
        .warning-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: #f0f9ff;
          border: 2px solid #bae6fd;
          color: #0284c7;
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
          z-index: 10;
        }

        .warning-close-btn:hover {
          transform: scale(1.1) rotate(90deg);
          background: #bae6fd;
          color: #075985;
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
        .sea-bubble--3 { width: 8px; height: 8px; left: 50%; bottom: 6px; transform: translateX(-50%); animation-delay: 0.9s; }

        /* Tia sáng lấp lánh pixel */
        .pixel-sparkle {
          position: absolute;
          color: #ffca3a;
          animation: warning-sparkle-spin 0.9s ease-in-out infinite;
        }
        .pixel-sparkle--1 { top: 10px; left: -10px; animation-delay: 0.2s; }
        .pixel-sparkle--2 { bottom: 40px; right: -12px; animation-delay: 0.9s; }

        /* --- TYPOGRAPHY ĐÁNG YÊU --- */
        .select-warning__eyebrow {
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

        .select-warning__title {
          margin: 0;
          color: #03486a;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .select-warning__message {
          margin: 12px 0 0;
          color: #4b6a7a;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- KHUNG GHI CHÚ ĐỒNG HỒ CÁT --- */
        .select-warning__note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 22px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 2px dashed #bae6fd;
          padding: 10px 18px;
          color: #075985;
          font-size: 12.5px;
          font-weight: 900;
          line-height: 1.4;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.04);
          width: fit-content;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* --- CÔNG CỤ ĐIỀU KHIỂN NỔI (CHỈ XUẤT HIỆN KHI PREVIEW TRÊN CANVAS) --- */
        .playground-floating-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.96);
          border: 3px solid #bae6fd;
          padding: 12px 18px;
          border-radius: 24px;
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.15);
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 9999;
          animation: slide-in-widget 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .widget-row {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
        }

        .widget-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: #38bdf8;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .widget-btn:hover {
          transform: scale(1.1);
          background: #0284c7;
        }

        .widget-timer {
          font-size: 12.5px;
          font-weight: 900;
          color: #075985;
        }

        /* Giọt mồ hôi lo lắng nẩy tưng tưng */
        @keyframes sweat-drop-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-2px, 3px) scale(1.15); }
        }

        /* Hiệu ứng rung rinh nhẹ cho khung tranh treo xúc tu */
        @keyframes photo-gently-sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }

        /* --- CÁC HOẠT ẢNH TỰ NHIÊN (KEYFRAMES) --- */
        @keyframes select-warning-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes select-warning-pop-in {
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

        @keyframes slide-in-widget {
          from { transform: translateY(40px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* CHỈ HIỂN THỊ TIỆN ÍCH PLAYGROUND NỔI KHI TRÊN ĐƯỜNG CANVAS PREVIEW */}
      {isStandalone && (
        <div className="playground-floating-widget" title="Công cụ hỗ trợ chạy thử Canvas">
          <div className="widget-row">
            <button type="button" className="widget-btn" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <span className="widget-timer">⏰ Giây: {secondsLeft}s</span>
            <button type="button" className="widget-btn" onClick={handleReset} title="Đặt lại bộ đếm">
              <RotateCcw size={12} />
            </button>
          </div>
          <div className="widget-row" style={{ marginTop: '4px', borderTop: '1px dashed #bae6fd', paddingTop: '6px' }}>
            <span className="widget-timer">📸 Chọn ảnh:</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" className="widget-btn" onClick={() => setLocalSelectedCount(prev => Math.max(1, prev - 1))}>
                <Minus size={10} />
              </button>
              <span className="widget-timer" style={{ minWidth: '12px', textAlign: 'center' }}>{selectedCount}</span>
              <button type="button" className="widget-btn" onClick={() => setLocalSelectedCount(prev => Math.min(4, prev + 1))}>
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="select-warning">
        {/* Nhãn ruy băng cảnh báo thủy cung nằm bên ngoài lớp cắt góc */}
        <div className="warning-ribbon">Thủy Cung Nhắc Giờ 🫧📸</div>

        {/* Nút tắt khẩn cấp nằm bên ngoài lớp cắt góc để giữ nguyên hình tròn */}
        <button type="button" className="warning-close-btn" onClick={handleClose}>×</button>

        {/* LỚP BẢO VỆ BO GÓC CHUYÊN NGHIỆP */}
        <div className="select-warning__inner">
          
          {/* Thanh countdown năng động giảm dần (được cắt góc tự động tuyệt đối) */}
          <div className="select-warning__bar-container">
            <div className="select-warning__bar" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="select-warning__body">
            
            {/* Khu vực Mascot Bé Bạch Tuộc ôm hai khung ảnh pixel dập dềnh */}
            <div className="mascot-container">
              <Sparkles className="pixel-sparkle pixel-sparkle--1" size={18} />
              <Sparkles className="pixel-sparkle pixel-sparkle--2" size={20} />
              
              {/* Bong bóng nổi bọt */}
              <div className="sea-bubble sea-bubble--1" style={{ '--b-dx': '-12px' }} />
              <div className="sea-bubble sea-bubble--2" style={{ '--b-dx': '12px' }} />
              <div className="sea-bubble sea-bubble--3" style={{ '--b-dx': '4px' }} />
              
              {/* BẢN VẼ TAY SVG 100% PIXEL ART BẠCH TUỘC HOẢNG HỐT KHỚP THEO FILE ẢNH CHỌN */}
              <svg 
                width="115" 
                height="115" 
                viewBox="0 0 128 128" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ shapeRendering: 'crispEdges', display: 'block', margin: '0 auto' }}
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

                {/* TENTACLE 2: Xúc tu trong bên trái (Nâng bức ảnh Polaroid dâu hồng) */}
                <g style={{ 
                  transformOrigin: '52px 86px', 
                  animation: 'warning-tentacle-2 0.9s ease-in-out infinite' 
                }}>
                  <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                  <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                  <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />

                  {/* KHUNG ẢNH POLAROID DÂU HỒNG TRÊN XÚC TU TRÁI */}
                  <g style={{ 
                    transformOrigin: '38px 84px', 
                    animation: 'photo-gently-sway 0.9s ease-in-out infinite' 
                  }}>
                    <rect x="28" y="80" width="14" height="18" fill="#FFFFFF" stroke="#5c112d" strokeWidth="1.5" />
                    <rect x="31" y="83" width="8" height="11" fill="#ff758c" />
                    <rect x="34" y="85" width="2" height="2" fill="#ffffff" />
                  </g>

                  <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
                </g>

                {/* TENTACLE 3: Xúc tu trong bên phải (Nâng bức ảnh Polaroid đại dương) */}
                <g style={{ 
                  transformOrigin: '76px 86px', 
                  animation: 'warning-tentacle-3 0.9s ease-in-out infinite' 
                }}>
                  <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                  <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                  <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />

                  {/* KHUNG ẢNH POLAROID XANH BIỂN TRÊN XÚC TU PHẢI */}
                  <g style={{ 
                    transformOrigin: '88px 84px', 
                    animation: 'photo-gently-sway 0.9s ease-in-out infinite alternate' 
                  }}>
                    <rect x="84" y="80" width="14" height="18" fill="#FFFFFF" stroke="#5c112d" strokeWidth="1.5" />
                    <rect x="87" y="83" width="8" height="11" fill="#38bdf8" />
                    <circle cx="91" cy="87" r="1.2" fill="#ffd166" />
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

            <p className="select-warning__eyebrow">Nhắc nhẹ</p>
            <h2 className="select-warning__title">Sắp hết giờ rồi nè! ⏰</h2>
            <p className="select-warning__message">{message}</p>
            
            {/* GHI CHÚ ĐỒNG HỒ CÁT DỄ THƯƠNG (CÂN ĐỐI TRỤC ĐỨNG TUYỆT ĐỐI) */}
            <div className="select-warning__note">
              <Clock3 size={15} className="animate-spin" style={{ animationDuration: '0.9s', color: '#0284c7', flexShrink: 0 }} />
              <span>Đồng hồ đã tạm dừng 5 giây để bạn đọc thong thả nhe!</span>
              <Info size={15} style={{ color: '#ff527b', flexShrink: 0 }} />
            </div>

          </div>
        </div>
      </section>
    </dialog>
  );
}
