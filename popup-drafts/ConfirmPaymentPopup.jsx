import React from 'react';
import { CheckCircle2, Heart, ShieldCheck, Loader2 } from 'lucide-react';

export function ConfirmPaymentPopup({
  busy = false,
  price = "15.000đ",
  serviceType = "digital",
  onCancel = () => {},
  onConfirm = () => {},
} = {}) {
  const isPrint = serviceType === 'print';
  const serviceLabel = isPrint ? "Rửa ảnh lấy ngay & file" : "Chỉ nhận file kỹ thuật số";

  return (
    <dialog
      open
      className="payment-popup-backdrop"
      aria-modal="true"
    >
      <style>{`
        /* --- BACKDROP PHỦ SỮA DÂU BỒNG BỀNH --- */
        .payment-popup-backdrop {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          margin: 0 !important;
          border: none !important;
          padding: 20px !important;
          z-index: 1200;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          background: rgba(64, 18, 41, 0.4) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          animation: payment-backdrop-in 0.3s ease-out forwards;
        }

        /* --- POPUP CHÍNH: CHÚC MỪNG VÀ HƯỚNG DẪN --- */
        .payment-popup {
          position: relative;
          width: min(100%, 420px);
          border: 6px solid #fff;
          border-radius: 46px;
          background: linear-gradient(135deg, #ffffff 0%, #fff5f8 60%, #e0f2fe 100%);
          color: #5c1123;
          text-align: center;
          box-shadow: 
            0 12px 0 #ffd0db,
            0 32px 65px rgba(92, 17, 35, 0.22);
          animation: payment-pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: visible;
        }

        .payment-popup__body {
          padding: 38px 26px 28px;
        }

        /* --- NHÃN RUY BĂNG QUẦY THANH TOÁN --- */
        .payment-ribbon {
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
          transform: rotate(3deg);
          animation: payment-ribbon-float 0.9s infinite alternate;
        }

        /* --- MASCOT BẠCH TUỘC THỦ QUỸ SIÊU CUTE --- */
        .mascot-container {
          position: relative;
          width: 140px;
          height: 130px;
          margin: -15px auto 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: payment-octopus-swim 0.9s ease-in-out infinite;
        }

        /* Ngôi sao chớp nhấp nháy */
        .pixel-sparkle {
          position: absolute;
          color: #ffca3a;
          animation: payment-sparkle-blink 0.9s ease-in-out infinite;
        }
        .pixel-sparkle--1 { top: 12px; left: -8px; animation-delay: 0.2s; }
        .pixel-sparkle--2 { bottom: 42px; right: -8px; animation-delay: 0.9s; }

        /* --- TYPOGRAPHY ĐÁNG YÊU --- */
        .payment-popup__eyebrow {
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

        .payment-popup__title {
          margin: 0;
          color: #4a0517;
          font-size: clamp(21px, 6vw, 24px);
          font-weight: 1000;
          line-height: 1.3;
        }

        .payment-popup__message {
          margin: 12px 0 0;
          color: #8c515e;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.65;
        }

        /* --- KHU VỰC THÔNG TIN DỊCH VỤ & GIÁ TIỀN --- */
        .payment-info-box {
          background: #ffffff;
          border: 2px dashed #ffccd5;
          border-radius: 24px;
          padding: 16px;
          margin: 22px auto 0;
          box-shadow: 0 4px 12px rgba(255, 82, 123, 0.04);
          text-align: left;
        }

        .payment-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .payment-info-row:last-child {
          margin-bottom: 0;
          border-top: 1px solid #ffe4e6;
          padding-top: 8px;
        }

        .info-label {
          font-size: 13px;
          font-weight: 700;
          color: #8c515e;
        }

        .info-value-service {
          font-size: 13px;
          font-weight: 800;
          color: #4a0517;
        }

        .info-value-price {
          font-size: 18px;
          font-weight: 1000;
          color: #f43f5e;
        }

        /* --- NOTE HƯỚNG DẪN QUẦY THANH TOÁN --- */
        .payment-counter-note {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          color: #0369a1;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 12.5px;
          font-weight: 800;
          text-align: left;
          margin-top: 16px;
          line-height: 1.4;
        }

        /* --- NÚT BẤM JELLY BONG BÓNG SIÊU NẨY --- */
        .payment-popup__actions {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 12px;
          margin-top: 24px;
        }

        .payment-popup__button {
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

        .payment-popup__button--ghost {
          background: #fff;
          border: 2.5px solid #ffccd5;
          color: #ff527b;
          box-shadow: 0 5px 0 #ffccd5;
        }

        .payment-popup__button--ghost:hover:not(:disabled) {
          background: #fff0f3;
          transform: translateY(-2px);
          box-shadow: 0 7px 0 #ffccd5;
        }

        .payment-popup__button--primary {
          background: linear-gradient(135deg, #ff8da1 0%, #ff527b 55%, #f43f5e 100%);
          background-size: 200% auto;
          color: #fff;
          box-shadow: 
            0 5px 0 #cd2c4f,
            0 12px 24px rgba(255, 82, 123, 0.3);
        }

        .payment-popup__button--primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 8px 0 #cd2c4f,
            0 16px 28px rgba(255, 82, 123, 0.4);
        }

        .payment-popup__button:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 1px 0 transparent;
        }

        .payment-popup__button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background: #ead9dc;
          box-shadow: none;
          color: #9c8488;
          border: none;
        }

        /* --- KEYFRAMES --- */
        @keyframes payment-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes payment-pop-in {
          0% { opacity: 0; transform: scale(0.72) translateY(38px) rotate(-2deg); }
          70% { transform: scale(1.05) translateY(-5px) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
        }

        @keyframes payment-ribbon-float {
          from { transform: rotate(3deg) translateY(0); }
          to { transform: rotate(6deg) translateY(-3px); }
        }

        @keyframes payment-octopus-swim {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-7px) scaleY(1.03); }
        }

        @keyframes payment-sparkle-blink {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.25) rotate(90deg); opacity: 1; }
        }

        @media (max-width: 480px) {
          .payment-popup__actions {
            grid-template-columns: 1fr;
          }
          .payment-popup__button--ghost {
            order: 2;
          }
        }
      `}</style>

      <section className="payment-popup">
        {/* Nhãn Quầy Thanh Toán */}
        <div className="payment-ribbon">Thanh Toán Tại Quầy 💁‍♀️💳</div>

        <div className="payment-popup__body">
          {/* Mascot bé bạch tuộc */}
          <div className="mascot-container">
            <Heart className="pixel-sparkle pixel-sparkle--1" size={18} fill="currentColor" />
            <Heart className="pixel-sparkle pixel-sparkle--2" size={20} fill="currentColor" />
            
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

              {/* Xúc tu và đầu tương tự bạch tuộc nhưng giữ chiếc ví/đống tiền xu */}
              <path d="M12 70H16V66H20V62H24V74H20V78H16V82H12V70Z" fill="#f19cb2" />
              <path d="M24 74H28V78H36V82H40V86H44V90H36V86H28V82H24V78H20V74H24Z" fill="#f19cb2" />
              
              {/* Đầu tròn bự */}
              <path d="M44 22H84V26H96V30H104V38H108V50H112V70H108V78H104V82H96V86H84V90H44V86H32V82H24V78H20V70H16V50H20V38H28V30H36V26H44V22Z" fill="#f19cb2" />
              
              {/* Mắt to đen nhấp nháy */}
              <rect x="52" y="66" width="4" height="4" fill="#6a3c4a" />
              <rect x="72" y="66" width="4" height="4" fill="#6a3c4a" />
              <rect x="54" y="66" width="2" height="2" fill="#FFFFFF" />
              <rect x="74" y="66" width="2" height="2" fill="#FFFFFF" />

              {/* Má hồng chũm chĩm */}
              <rect x="44" y="70" width="8" height="4" fill="#f77595" />
              <rect x="76" y="70" width="8" height="4" fill="#f77595" />
              
              {/* Miệng cười xinh */}
              <path d="M62 72H66V74H62V72Z" fill="#6a3c4a" />
              
              {/* Đồng xu vàng ngộ nghĩnh */}
              <rect x="54" y="86" width="20" height="12" rx="4" fill="#ffd166" stroke="#5c1123" strokeWidth="1.5" />
              <circle cx="64" cy="92" r="3" fill="#ffca3a" />
            </svg>
          </div>

          <p className="payment-popup__eyebrow">Xác nhận đơn hàng 🌸</p>
          <h2 className="payment-popup__title">Chốt ảnh thẻ nhé! ✨</h2>
          <p className="payment-popup__message">
            {isPrint 
              ? "Bé bạch tuộc sẽ chuẩn bị bản in 9 ảnh và file ảnh 3x4 cho bạn." 
              : "Bé bạch tuộc sẽ chuẩn bị file ảnh 3x4 gửi qua mã QR cho bạn."
            }
          </p>

          {/* Hộp thông tin giá */}
          <div className="payment-info-box">
            <div className="payment-info-row">
              <span className="info-label">Gói dịch vụ:</span>
              <span className="info-value-service">{serviceLabel}</span>
            </div>
            <div className="payment-info-row">
              <span className="info-label">Cần thanh toán:</span>
              <span className="info-value-price">{price}</span>
            </div>
          </div>

          {/* Note quầy thanh toán */}
          <div className="payment-counter-note">
            <ShieldCheck size={18} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
            <span>Bạn vui lòng thanh toán tại quầy thu ngân để hoàn tất nhận ảnh nhé! 💕 Staff sẽ hỗ trợ bạn ngay.</span>
          </div>

          {/* Các nút hành động */}
          <div className="payment-popup__actions">
            <button
              type="button"
              className="payment-popup__button payment-popup__button--ghost"
              onClick={onCancel}
              disabled={busy}
            >
              Chọn lại ảnh
            </button>
            <button
              type="button"
              className="payment-popup__button payment-popup__button--primary"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </button>
          </div>
        </div>
      </section>
    </dialog>
  );
}
