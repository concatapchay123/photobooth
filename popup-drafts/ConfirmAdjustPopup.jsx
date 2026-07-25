import React, { useState } from 'react';
import { CheckCircle2, Loader2, Printer, SlidersHorizontal, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#d9b3c4',
      padding: 24,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <ConfirmPrintPopup />
    </div>
  );
}

const rectToPoints = (zone) =>
  zone.points || [
    { x: zone.x, y: zone.y },
    { x: zone.x + zone.width, y: zone.y },
    { x: zone.x + zone.width, y: zone.y + zone.height },
    { x: zone.x, y: zone.y + zone.height },
  ];

const getPolygonCss = (zone) => {
  const points = rectToPoints(zone);
  return points
    .map((point) => `${((point.x - zone.x) / zone.width) * 100}% ${((point.y - zone.y) / zone.height) * 100}%`)
    .join(', ');
};

export function ConfirmPrintPopup({
  busy = false,
  onCancel = () => {},
  onConfirm = () => {},
  slotEdits = [],
  zones = [],
  originalFrame = null,
  frameDimensions = null,
} = {}) {
  const [hoveredQuantity, setHoveredQuantity] = useState(2);

  const options = [
    { qty: 2, price: '60' },
    { qty: 4, price: '100' },
    { qty: 6, price: '150' },
    { qty: 8, price: '200' },
    { qty: 10, price: '250' }
  ];

  const getBubbleText = () => {
    switch (hoveredQuantity) {
      case 2: return "Nhận 2 tấm xinh xắn! 💖";
      case 4: return "Nhận 4 tấm siêu vui! 🌟";
      case 6: return "Nhận 6 tấm cả nhóm! 🍓";
      case 8: return "Nhận 8 tấm chia nhau! 🎀";
      case 10: return "Nhận 10 tấm phủ phê! 👑";
      default: return "Chọn số lượng nha! 🫰";
    }
  };

  const displayCount = hoveredQuantity || 2;

  const hasRealPhotos = Array.isArray(slotEdits) && slotEdits.length > 0 && Array.isArray(zones) && zones.length > 0 && originalFrame && frameDimensions && frameDimensions.width > 0 && frameDimensions.height > 0;

  const frameRatio = frameDimensions && frameDimensions.width && frameDimensions.height ? frameDimensions.width / frameDimensions.height : 1 / 3;

  const getStripStyle = (idx, total) => {
    let scale = 0.9;
    let margin = '0 -15px';
    let rotationStep = 6;
    
    if (total === 2) {
      scale = 1.0;
      margin = '0 -8px';
      rotationStep = 4;
    } else if (total === 4) {
      scale = 0.98;
      margin = '0 -15px';
      rotationStep = 5.5;
    } else if (total === 6) {
      scale = 0.94;
      margin = '0 -22px';
      rotationStep = 5.5;
    } else if (total === 8) {
      scale = 0.88;
      margin = '0 -26px';
      rotationStep = 5;
    } else if (total === 10) {
      scale = 0.83;
      margin = '0 -30px';
      rotationStep = 4.5;
    }

    const rotation = (idx - (total - 1) / 2) * rotationStep;
    const distanceFromCenter = Math.abs(idx - (total - 1) / 2);
    
    // Dynamic vertical shift based on the total number of cards to prevent taller card sets
    // (at smaller counts like 2, 4, 6) from shifting up too high and overlapping the speech bubble.
    const baseShifts = {
      2: 7,
      4: 3,
      6: -6,
      8: -22,
      10: -36
    };
    const baseShift = baseShifts[total] || -25;
    const translateY = (distanceFromCenter * distanceFromCenter * 0.6) + baseShift;

    return {
      margin,
      zIndex: 10 + idx,
      transform: `scale(${scale}) rotate(${rotation}deg) translateY(${translateY}px)`,
    };
  };

  return (
    <div 
      className="capture-popup-backdrop" 
      style={{ zIndex: 1700 }}
      onClick={onCancel}
    >
      <style>{`

        /* Custom styles for the cancel/back button */
        .print-confirm-back-btn {
          background: #ffeef5 !important;
          color: #e0317e !important;
          border: 2px dashed #ffccd8 !important;
          box-shadow: none !important;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
          transform: none;
        }
        .print-confirm-back-btn:hover:not(:disabled) {
          background: #ffccd8 !important;
          color: #7d1043 !important;
          border-color: #f73591 !important;
          transform: translateY(-2px) scale(1.03) !important;
        }
        .print-confirm-back-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.98) !important;
        }

        /* Fan-out strip styling with bottom-center pivot */
        .print-preview-strip {
          background: #ffffff;
          border: 3px solid #5c1123;
          border-radius: 12px;
          padding: 4px;
          box-shadow: 4px 4px 0px rgba(92, 17, 35, 0.15);
          width: calc(220px * var(--frame-ratio, 0.333)) !important;
          height: 220px;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), scale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), translate 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, margin 0.3s ease;
          transform-origin: bottom center;
          position: relative;
        }
        .print-preview-strip:hover {
          scale: 1.12;
          translate: 0 -10px;
          z-index: 100 !important;
          box-shadow: 8px 8px 0px rgba(92, 17, 35, 0.25);
        }

        .print-preview-strip .photo-strip-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 1.15 / 1;
          border: 1.5px solid #5c1123;
          border-radius: 6px;
          overflow: hidden;
          background: #fff0f4;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .print-preview-strip .photo-strip-logo-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
        }
        .print-preview-strip .photo-strip-logo {
          font-family: 'Cherry Bomb One', cursive;
          font-size: 7px;
          color: #f73591;
          text-align: center;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .print-preview-strip .photo-strip-barcode {
          width: 24px;
          height: 4px;
          opacity: 0.7;
          margin-top: 2px;
          background-image: repeating-linear-gradient(90deg, #5c1123, #5c1123 1px, transparent 1px, transparent 2.5px);
        }

        /* 3D Ticket Quantity Container (Horizontal Flex) */
        .print-qty-container {
          display: flex !important;
          flex-direction: row !important;
          justify-content: center !important;
          gap: 12px !important;
          width: 100% !important;
          max-width: 580px !important;
          margin-bottom: 20px !important;
        }

        /* 3D Ticket Quantity Buttons (Horizontal) */
        .print-qty-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 6px !important;
          border-radius: 20px !important;
          border: 3px solid #5c1123 !important;
          background: linear-gradient(180deg, #ffffff 0%, #fff0f4 100%) !important;
          box-shadow: 0 6px 0px #5c1123 !important;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out, background 0.1s ease-in-out !important;
          position: relative;
          outline: none;
        }
        .print-qty-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 0px #5c1123 !important;
        }
        .print-qty-btn:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 2px 0px #5c1123 !important;
        }
        .print-qty-btn.is-active {
          transform: translateY(2px) !important;
          box-shadow: 0 4px 0px #5c1123 !important;
          background: linear-gradient(180deg, #ffeef2 0%, #ffccd8 100%) !important;
          border-color: #ff527b !important;
        }
        .print-qty-btn.is-active .print-qty-btn-badge {
          color: #ff527b !important;
        }
        .print-qty-btn.is-active .print-qty-btn-price {
          background: #ff527b !important;
          border-color: #5c1123 !important;
        }
        .print-qty-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
          transform: translateY(4px);
          border-color: #8a6c74 !important;
        }
        .print-qty-btn-badge {
          font-family: 'Cherry Bomb One', cursive;
          font-size: 24px;
          line-height: 1;
          color: #f73591;
        }
        .print-qty-btn-label {
          font-family: 'Baloo 2', sans-serif;
          font-size: 11px;
          font-weight: 1000;
          color: #8f3d68;
          margin-top: -2px;
          margin-bottom: 5px;
        }
        .print-qty-btn-price {
          font-family: 'Baloo 2', sans-serif;
          font-size: 12px;
          font-weight: 1000;
          color: #ffffff;
          background: #f73591;
          border: 2px solid #5c1123;
          padding: 1px 8px;
          border-radius: 10px;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.15);
        }

        /* Mobile Responsive adjustments for horizontal buttons and preview */
        @media (max-width: 480px) {
          .print-qty-container {
            gap: 6px !important;
          }
          .print-qty-btn {
            padding: 8px 4px !important;
            border-radius: 14px !important;
            border-width: 2px !important;
            box-shadow: 0 4px 0px #5c1123 !important;
          }
          .print-qty-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 5px 0px #5c1123 !important;
          }
          .print-qty-btn:active:not(:disabled) {
            transform: translateY(3px);
            box-shadow: 0 1px 0px #5c1123 !important;
          }
          .print-qty-btn-badge {
            font-size: 18px !important;
          }
          .print-qty-btn-label {
            font-size: 9px !important;
            margin-bottom: 3px !important;
          }
          .print-qty-btn-price {
            font-size: 10px !important;
            padding: 1px 4px !important;
            border-width: 1.5px !important;
            border-radius: 8px !important;
          }
          .print-preview-strip {
            width: calc(185px * var(--frame-ratio, 0.333)) !important;
            height: 185px;
          }

          .photo-strip-logo {
            font-size: 5.5px !important;
          }
        }

        /* Keep the pixel-art octopus animations self-contained */
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
      `}</style>

      <div 
        className="capture-popup korean-vibe-popup" 
        style={{ width: 'min(100%, 650px)', maxWidth: '650px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating stickers */}
        <div className="korean-vibe-sticker korean-vibe-sticker--cherry text-2xl" title="Cherries!🍒">🍒</div>
        <div className="korean-vibe-sticker korean-vibe-sticker--star1 text-xl" title="Star!⭐">⭐</div>
        <div className="korean-vibe-sticker korean-vibe-sticker--star2 text-lg" title="Star!⭐">⭐</div>
        <div className="korean-vibe-sticker korean-vibe-sticker--heart1 text-2xl" title="Heart!💖">💖</div>
        <div className="korean-vibe-sticker korean-vibe-sticker--sparkle text-xl" title="Sparkle!✨">✨</div>

        {!busy && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="absolute top-5 right-5 size-8 rounded-full bg-[#ffeef2] hover:bg-[#ff527b] hover:text-white flex items-center justify-center font-bold text-sm text-[#ff527b] transition-all duration-300 cursor-pointer hover:rotate-90 z-20 shadow-sm border-2 border-[#5c1123]"
            title="Đóng"
          >
            ✕
          </button>
        )}

        <div className="capture-popup__body flex flex-col items-center">
          {/* Title Banner */}
          <div className="text-center w-full mb-4 relative z-10 px-2">
            <span className="korean-badge mb-1">
              CÔNG ĐOẠN CUỐI CÙNG 🌸
            </span>
            <h2 
              className="text-3xl md:text-4.5xl font-black mt-3 text-[#9a1758] tracking-wide select-none flex items-center justify-center gap-2 flex-wrap" 
              style={{ 
                fontFamily: '"Cherry Bomb One", cursive',
              }}
            >
              <span style={{ textShadow: '2px 2px 0px #ffffff, 4px 4px 0px #ff527b' }}>
                Bạn muốn in bao nhiêu ảnh xinh dọooo?
              </span>
              <span style={{ textShadow: 'none' }} className="inline-block hover:scale-110 transition-transform duration-200">
                🖨️
              </span>
            </h2>
            <p className="text-xs md:text-sm text-[#8f3d68] font-bold mt-2">
              Chọn số lượng ảnh photobooth bạn muốn nhận ở bên dưới nhé 💕
            </p>
          </div>

          {/* Interactive Speech Bubble */}
          <div className="flex justify-center mb-1">
            <div className="korean-vibe-bubble" style={{ margin: 0 }}>
              {getBubbleText()}
            </div>
          </div>

          {/* Upper Pane: Fanned-out Photo Strips Preview */}
          <div className="flex items-center justify-center py-2 min-h-[235px] relative overflow-visible w-full mb-6">
            {busy ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                <div className="relative">
                  <Loader2 className="size-12 animate-spin text-[#f73591]" />
                  <Printer className="size-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#f73591]" />
                </div>
                <h3 className="font-black text-base md:text-lg text-[#9a1758]" style={{ fontFamily: '"Baloo 2", sans-serif' }}>
                  Đang gửi lệnh in phép thuật…
                </h3>
                <p className="text-xs font-bold text-[#b84c7d]">
                  Hệ thống đang rửa ảnh, bạn vui lòng đợi chút nhé! 🫧
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center relative w-full overflow-visible h-full">
                {Array.from({ length: displayCount }).map((_, idx) => {
                  const stripStyle = getStripStyle(idx, displayCount);

                  if (hasRealPhotos) {
                    return (
                      <div 
                        key={idx} 
                        className="print-preview-strip"
                        style={{
                          ...stripStyle,
                          '--frame-ratio': frameRatio,
                          padding: 0,
                          display: 'block',
                        }}
                      >
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          borderRadius: '8px',
                        }}>
                          {slotEdits.map((edit) => {
                            const zone = zones.find((z) => z.slotIndex === edit.slotIndex);
                            if (!zone) return null;
                            return (
                              <div
                                key={edit.photoId}
                                style={{
                                  position: 'absolute',
                                  left: `${(zone.x / frameDimensions.width) * 100}%`,
                                  top: `${(zone.y / frameDimensions.height) * 100}%`,
                                  width: `${(zone.width / frameDimensions.width) * 100}%`,
                                  height: `${(zone.height / frameDimensions.height) * 100}%`,
                                  clipPath: `polygon(${getPolygonCss(zone)})`,
                                  overflow: 'hidden',
                                  background: '#ffffff',
                                }}
                              >
                                <img
                                  src={edit.url}
                                  alt={edit.name}
                                  draggable="false"
                                  style={{
                                    position: 'absolute',
                                    display: 'block',
                                    left: `${((edit.x - zone.x) / zone.width) * 100}%`,
                                    top: `${((edit.y - zone.y) / zone.height) * 100}%`,
                                    width: `${(edit.naturalWidth * edit.scale / zone.width) * 100}%`,
                                    height: `${(edit.naturalHeight * edit.scale / zone.height) * 100}%`,
                                    transform: `rotate(${edit.rotation || 0}deg) scale(${edit.flipX ? -1 : 1}, ${edit.flipY ? -1 : 1})`,
                                    transformOrigin: 'center center',
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    objectFit: 'fill',
                                  }}
                                />
                              </div>
                            );
                          })}
                          {originalFrame && (
                            <img
                              src={originalFrame}
                              alt="Frame overlay"
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                objectFit: 'fill',
                                zIndex: 5,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idx} 
                      className="print-preview-strip"
                      style={stripStyle}
                    >
                      {/* Frame 1: Wink + Crown */}
                      <div className="photo-strip-frame">
                        <svg className="w-[82%] h-[82%]" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: 'crispEdges', zIndex: 2 }}>
                          <ellipse cx="64" cy="115" rx="22" ry="3" fill="#ffb7c5" opacity="0.4" />
                          <g style={{ transformOrigin: '48px 84px', animation: 'tentacle-move-1 0.9s ease-in-out infinite' }}>
                            <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                            <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                            <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                            <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                            <rect x="14" y="74" width="6" height="6" fill="#ffd166" />
                            <rect x="16" y="76" width="2" height="2" fill="#5c1123" />
                            <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
                          </g>
                          <g style={{ transformOrigin: '52px 86px', animation: 'tentacle-move-2 0.9s ease-in-out infinite' }}>
                            <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                            <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                            <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />
                            <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
                          </g>
                          <g style={{ transformOrigin: '76px 86px', animation: 'tentacle-move-3 0.9s ease-in-out infinite' }}>
                            <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                            <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                            <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />
                            <rect x="78" y="86" width="16" height="12" rx="2" fill="#4fb477" stroke="#5c1123" strokeWidth="1.5" />
                            <rect x="82" y="83" width="4" height="3" fill="#ffca3a" />
                            <circle cx="86" cy="92" r="3.5" fill="#ffffff" stroke="#5c1123" strokeWidth="1.5" />
                            <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
                          </g>
                          <g style={{ transformOrigin: '80px 84px', animation: 'tentacle-move-4 0.9s ease-in-out infinite' }}>
                            <path d="M116 70H112V66H108V62H104V74H108V78H112V82H116V70Z" fill="#f19cb2" />
                            <path d="M104 74H100V78H92V82H88V86H84V90H92V86H100V82H104V78H108V74H104Z" fill="#f19cb2" />
                            <rect x="108" y="70" width="4" height="4" fill="#FFFFFF" />
                            <rect x="96" y="78" width="8" height="4" fill="#FFFFFF" />
                            <path d="M116 82H108V86H100V90H92V94H84V90H92V86H100V82H108V78H116V82Z" fill="#bc7687" opacity="0.6" />
                          </g>
                          <path d="M44 22H84V26H96V30H104V38H108V50H112V70H108V78H104V82H96V86H84V90H44V86H32V82H24V78H20V70H16V50H20V38H28V30H36V26H44V22Z" fill="#f19cb2" />
                          <path d="M32 82H44V86H84V82H96V86H84V90H44V86H32V82Z" fill="#bc7687" opacity="0.5" />
                          <path d="M32 38H40V34H48V30H44V34H36V38H32V42H28V50H32V42H32Z" fill="#FFFFFF" />
                          <rect x="52" y="30" width="4" height="4" fill="#FFFFFF" />
                          <path d="M104 46V54H100V46H104Z" fill="#FFFFFF" />
                          <rect x="50" y="68" width="8" height="2" fill="#6a3c4a" />
                          <rect x="72" y="66" width="4" height="4" fill="#6a3c4a" />
                          <rect x="74" y="66" width="2" height="2" fill="#FFFFFF" />
                          <rect x="44" y="70" width="8" height="4" fill="#f77595" />
                          <rect x="76" y="70" width="8" height="4" fill="#f77595" />
                          <rect x="62" y="70" width="4" height="4" fill="#6a3c4a" />
                          <rect x="63" y="71" width="2" height="2" fill="#ffb7c5" />
                          <path d="M 52 14 L 56 22 H 72 L 76 14 L 70 18 L 64 12 L 58 18 Z" fill="#ffd166" stroke="#5c1123" strokeWidth="1.5" />
                          <circle cx="52" cy="13" r="1.5" fill="#ff527b" />
                          <circle cx="64" cy="11" r="1.5" fill="#ff527b" />
                          <circle cx="76" cy="13" r="1.5" fill="#ff527b" />
                        </svg>
                      </div>
                      {/* Frame 2: Cool Sunglasses */}
                      <div className="photo-strip-frame">
                        <svg className="w-[82%] h-[82%]" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: 'crispEdges', zIndex: 2 }}>
                          <ellipse cx="64" cy="115" rx="22" ry="3" fill="#ffb7c5" opacity="0.4" />
                          <g style={{ transformOrigin: '48px 84px', animation: 'tentacle-move-1 0.9s ease-in-out infinite' }}>
                            <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                            <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                            <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                            <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                            <rect x="14" y="74" width="6" height="6" fill="#ffd166" />
                            <rect x="16" y="76" width="2" height="2" fill="#5c1123" />
                            <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
                          </g>
                          <g style={{ transformOrigin: '52px 86px', animation: 'tentacle-move-2 0.9s ease-in-out infinite' }}>
                            <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                            <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                            <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />
                            <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
                          </g>
                          <g style={{ transformOrigin: '76px 86px', animation: 'tentacle-move-3 0.9s ease-in-out infinite' }}>
                            <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                            <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                            <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />
                            <rect x="78" y="86" width="16" height="12" rx="2" fill="#4fb477" stroke="#5c1123" strokeWidth="1.5" />
                            <rect x="82" y="83" width="4" height="3" fill="#ffca3a" />
                            <circle cx="86" cy="92" r="3.5" fill="#ffffff" stroke="#5c1123" strokeWidth="1.5" />
                            <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
                          </g>
                          <g style={{ transformOrigin: '80px 84px', animation: 'tentacle-move-4 0.9s ease-in-out infinite' }}>
                            <path d="M116 70H112V66H108V62H104V74H108V78H112V82H116V70Z" fill="#f19cb2" />
                            <path d="M104 74H100V78H92V82H88V86H84V90H92V86H100V82H104V78H108V74H104Z" fill="#f19cb2" />
                            <rect x="108" y="70" width="4" height="4" fill="#FFFFFF" />
                            <rect x="96" y="78" width="8" height="4" fill="#FFFFFF" />
                            <path d="M116 82H108V86H100V90H92V94H84V90H92V86H100V82H108V78H116V82Z" fill="#bc7687" opacity="0.6" />
                          </g>
                          <path d="M44 22H84V26H96V30H104V38H108V50H112V70H108V78H104V82H96V86H84V90H44V86H32V82H24V78H20V70H16V50H20V38H28V30H36V26H44V22Z" fill="#f19cb2" />
                          <path d="M32 82H44V86H84V82H96V86H84V90H44V86H32V82Z" fill="#bc7687" opacity="0.5" />
                          <path d="M32 38H40V34H48V30H44V34H36V38H32V42H28V50H32V42H32Z" fill="#FFFFFF" />
                          <rect x="52" y="30" width="4" height="4" fill="#FFFFFF" />
                          <path d="M104 46V54H100V46H104Z" fill="#FFFFFF" />
                          <rect x="46" y="62" width="36" height="8" fill="#1e1e24" rx="2" />
                          <rect x="62" y="65" width="4" height="2" fill="#1e1e24" />
                          <rect x="50" y="64" width="4" height="2" fill="#ffffff" />
                          <rect x="72" y="64" width="4" height="2" fill="#ffffff" />
                          <rect x="44" y="70" width="8" height="4" fill="#f77595" />
                          <rect x="76" y="70" width="8" height="4" fill="#f77595" />
                          <path d="M 62 72 Q 64 75 66 72" stroke="#6a3c4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                      {/* Frame 3: Happy Closed Eyes + Heart */}
                      <div className="photo-strip-frame">
                        <svg className="w-[82%] h-[82%]" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: 'crispEdges', zIndex: 2 }}>
                          <ellipse cx="64" cy="115" rx="22" ry="3" fill="#ffb7c5" opacity="0.4" />
                          <g style={{ transformOrigin: '48px 84px', animation: 'tentacle-move-1 0.9s ease-in-out infinite' }}>
                            <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
                            <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
                            <rect x="16" y="70" width="4" height="4" fill="#FFFFFF" />
                            <rect x="24" y="78" width="8" height="4" fill="#FFFFFF" />
                            <rect x="14" y="74" width="6" height="6" fill="#ffd166" />
                            <rect x="16" y="76" width="2" height="2" fill="#5c1123" />
                            <path d="M12 82H20V86H28V90H36V94H44V90H36V86H28V82H20V78H12V82Z" fill="#bc7687" opacity="0.6" />
                          </g>
                          <g style={{ transformOrigin: '52px 86px', animation: 'tentacle-move-2 0.9s ease-in-out infinite' }}>
                            <path d="M44 82H48V90H44V98H40V106H44V110H48V106H52V98H52V90H48V82H44Z" fill="#f19cb2" />
                            <rect x="44" y="94" width="4" height="8" fill="#FFFFFF" />
                            <rect x="44" y="106" width="4" height="4" fill="#FFFFFF" />
                            <path d="M52 90H56V98H52V106H48V110H44V106H48V98H52V90Z" fill="#bc7687" opacity="0.5" />
                          </g>
                          <g style={{ transformOrigin: '76px 86px', animation: 'tentacle-move-3 0.9s ease-in-out infinite' }}>
                            <path d="M84 82H80V90H84V98H88V106H84V110H80V106H76V98H76V90H80V82H84Z" fill="#f19cb2" />
                            <rect x="80" y="94" width="4" height="8" fill="#FFFFFF" />
                            <rect x="80" y="106" width="4" height="4" fill="#FFFFFF" />
                            <rect x="78" y="86" width="16" height="12" rx="2" fill="#4fb477" stroke="#5c1123" strokeWidth="1.5" />
                            <rect x="82" y="83" width="4" height="3" fill="#ffca3a" />
                            <circle cx="86" cy="92" r="3.5" fill="#ffffff" stroke="#5c1123" strokeWidth="1.5" />
                            <path d="M76 90H72V98H76V106H80V110H84V106H80V98H76V90Z" fill="#bc7687" opacity="0.5" />
                          </g>
                          <g style={{ transformOrigin: '80px 84px', animation: 'tentacle-move-4 0.9s ease-in-out infinite' }}>
                            <path d="M116 70H112V66H108V62H104V74H108V78H112V82H116V70Z" fill="#f19cb2" />
                            <path d="M104 74H100V78H92V82H88V86H84V90H92V86H100V82H104V78H108V74H104Z" fill="#f19cb2" />
                            <rect x="108" y="70" width="4" height="4" fill="#FFFFFF" />
                            <rect x="96" y="78" width="8" height="4" fill="#FFFFFF" />
                            <path d="M116 82H108V86H100V90H92V94H84V90H92V86H100V82H108V78H116V82Z" fill="#bc7687" opacity="0.6" />
                          </g>
                          <path d="M44 22H84V26H96V30H104V38H108V50H112V70H108V78H104V82H96V86H84V90H44V86H32V82H24V78H20V70H16V50H20V38H28V30H36V26H44V22Z" fill="#f19cb2" />
                          <path d="M32 82H44V86H84V82H96V86H84V90H44V86H32V82Z" fill="#bc7687" opacity="0.5" />
                          <path d="M32 38H40V34H48V30H44V34H36V38H32V42H28V50H32V42H32Z" fill="#FFFFFF" />
                          <rect x="52" y="30" width="4" height="4" fill="#FFFFFF" />
                          <path d="M104 46V54H100V46H104Z" fill="#FFFFFF" />
                          <path d="M 48 68 Q 52 64 56 68" stroke="#6a3c4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          <path d="M 68 68 Q 72 64 76 68" stroke="#6a3c4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          <rect x="44" y="70" width="8" height="4" fill="#f77595" />
                          <rect x="76" y="70" width="8" height="4" fill="#f77595" />
                          <rect x="62" y="70" width="4" height="4" fill="#6a3c4a" />
                          <g style={{ transform: 'translate(4px, 2px)' }}>
                            <path d="M 86 42 H 90 V 46 H 86 Z M 94 42 H 98 V 46 H 94 Z M 88 44 H 96 V 48 H 88 Z M 90 48 H 94 V 52 H 90 Z" fill="#ff4b72" />
                          </g>
                        </svg>
                      </div>
                      {/* Brand Logo */}
                      <div className="photo-strip-logo-area">
                        <div className="photo-strip-logo">QUANCHILL</div>
                        <div className="photo-strip-barcode"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lower Pane: Horizontal button list */}
          <div className="w-full relative z-10 px-1 mt-1 flex flex-col items-center">
            {!busy && (
              <div className="print-qty-container">
                {options.map(({ qty, price }) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => onConfirm(qty)}
                    className={`print-qty-btn group ${hoveredQuantity === qty ? 'is-active' : ''}`}
                    onMouseEnter={() => setHoveredQuantity(qty)}
                  >
                    <span className="print-qty-btn-badge">{qty}</span>
                    <span className="print-qty-btn-label">tấm</span>
                  </button>
                ))}
              </div>
            )}

            {/* Back button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="w-full max-w-[320px] py-2.5 rounded-2xl font-black print-confirm-back-btn flex items-center justify-center gap-2 cursor-pointer text-sm"
              style={{ fontFamily: '"Baloo 2", sans-serif' }}
            >
              <SlidersHorizontal size={15} />
              Quay lại trang trí thêm 🍓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ConfirmAdjustPopup = ConfirmPrintPopup;
