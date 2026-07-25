import React from 'react';
import { Sparkles, Loader2, QrCode, Check, Copy, Info, Printer } from 'lucide-react';

export default function GuestResultScreen({
  isResultUnlocked,
  boothMode,
  guestShare,
  isGeneratingGuestResult,
  guestPreviewUrl,
  guestShareExpiryText,
  guestQrUrl,
  copyGuestShareLink,
  isCopiedShareLink,
  guestNotice,
  guestSyncStatus,
  pendingGuestSyncCount,
  guestPrintStatus,
  guestPrintFallbackAvailable,
  printGuestPhoto,
  isGuestPrinting,
  openGuestBrowserPrintFallback,
  guestNewSessionCountdown
}) {
  return (
    <div className="w-screen h-[100dvh] shrink-0 overflow-hidden relative flex flex-col justify-center items-center pt-[108px] pb-8 px-4 md:px-8" style={{ boxSizing: 'border-box' }}>
      <section id="guest-result" className={`pink-step ${isResultUnlocked ? 'active' : ''}`} data-disabled={!isResultUnlocked}>
          <div className="pink-card p-6 md:p-8 text-center relative overflow-hidden pink-premium-result-card w-full h-full flex flex-col justify-between">
            {/* Decorative backgrounds */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-300/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-300/10 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-4 flex justify-between items-center gap-4 border-b border-pink-100/60 pb-3 shrink-0">
              <div className="text-left">
                <h2 className="pink-step-headline flex items-center gap-2">
                  <Sparkles className="size-6 text-[#f73591] animate-pulse shrink-0" />
                  <span>{boothMode === 'photobooth' ? '5. Bản in xinh đã sẵn sàng!' : '3. Bản in xinh đã sẵn sàng!'}</span>
                </h2>
              </div>
            </div>

            <div className={`pink-result-download-layout flex-1 overflow-hidden mb-4 ${guestShare?.shareUrl ? 'with-qr' : ''}`}>
              
              {/* Left: Photobooth sheet preview */}
              <div className="flex flex-col items-center justify-center gap-4 h-full overflow-hidden">
                <div className="pink-result-box pink-result-paper-mockup p-6 rounded-[28px] bg-gradient-to-br from-[#fff7fb] to-[#fff]/40 border border-pink-100/60 shadow-inner flex items-center justify-center w-full h-full overflow-hidden">
                  {isGeneratingGuestResult && (
                    <div className="flex flex-col items-center gap-3 text-sm font-black text-[#f73591] py-12">
                      <Loader2 className="size-10 animate-spin" />
                      <span>Đang rửa ảnh, bạn đợi xíu nha…</span>
                    </div>
                  )}
                  {!isGeneratingGuestResult && guestPreviewUrl && (
                    <div className="relative group p-2 bg-white rounded-xl shadow-lg border border-slate-100/80 transform hover:scale-[1.01] transition-all duration-300 max-h-full overflow-hidden flex items-center justify-center">
                      <img src={guestPreviewUrl} alt={boothMode === 'photobooth' ? "Tờ in photobooth 10x15 hoàn thành" : "Tờ in ảnh thẻ 10x15 hoàn thành"} className="pink-result-image max-w-full max-h-full object-contain rounded-lg border border-slate-50 shadow-sm" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                    </div>
                  )}
                  {!isGeneratingGuestResult && !guestPreviewUrl && (
                    <div className="text-sm font-black text-pink-400 py-12">Chờ bạn ở bước rửa ảnh nha…</div>
                  )}
                </div>
              </div>

              {/* Right: QR Code and URL Link Box */}
              {guestShare?.shareUrl && (
                <div className="pink-premium-qr-card p-6 md:p-8 rounded-3xl border border-[#ffc6e2] bg-white flex flex-col justify-between items-center gap-8 md:gap-10 shadow-lg w-full max-w-full relative overflow-hidden h-full">
                  <div className="absolute -top-12 -left-12 w-24 h-24 bg-pink-100/30 rounded-full blur-xl pointer-events-none" />
                  
                  {/* Header */}
                  <div className="w-full text-center">
                    <h3 className="font-black text-[#74194a] text-lg md:text-xl flex items-center justify-center gap-3">
                      <QrCode className="size-6 md:size-8 text-[#f73591]" />
                      <span>Tải ảnh về điện thoại</span>
                    </h3>
                    <p className="text-sm md:text-base text-[#7a4962] font-bold mt-2 leading-relaxed">
                      Quét mã QR để tải bản in và từng khung ảnh chất lượng cao.
                    </p>
                    {guestShareExpiryText && (
                      <p className="pink-qr-expiry text-pink-600 font-extrabold text-xs md:text-sm mt-2">
                        {guestShareExpiryText}
                      </p>
                    )}
                  </div>

                  {/* QR Code with decorative border and laser scanning animation */}
                  <div className="relative p-6 md:p-8 bg-white rounded-3xl border border-pink-100 shadow-md group overflow-hidden">
                    <div className="absolute inset-0 border-2 border-dashed border-[#ff91c6]/30 rounded-2xl group-hover:border-[#f73591]/50 transition-colors pointer-events-none" />
                    
                    {/* Laser scanning line effect */}
                    <div className="pink-scanner-line absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f73591] to-transparent z-10 pointer-events-none" />
                    
                    {guestQrUrl ? (
                      <img src={guestQrUrl} alt="Mã QR tải ảnh photobooth" className="w-[260px] h-[260px] md:w-[320px] md:h-[320px] object-contain rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-[260px] h-[260px] md:w-[320px] md:h-[320px] flex items-center justify-center text-xs font-bold text-pink-400">
                        QR chưa sẵn sàng
                      </div>
                    )}
                  </div>

                  {/* Integrated copy link field */}
                  <div className="w-full mt-2">
                    <div className="pink-copy-input-group flex items-center border border-[#ffc6e2] rounded-full p-1.5 md:p-2 bg-[#fff7fb] hover:border-[#f73591] focus-within:border-[#f73591] transition-all shadow-inner">
                      <input
                        type="text"
                        readOnly
                        value={guestShare.shareUrl}
                        className="flex-1 bg-transparent px-4 py-2 text-xs md:text-sm text-[#8f3d68] font-bold outline-none select-all overflow-hidden text-ellipsis whitespace-nowrap"
                      />
                      <button
                        type="button"
                        onClick={copyGuestShareLink}
                        className={`px-5 py-2.5 text-xs md:text-sm font-extrabold rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isCopiedShareLink 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'bg-[#ffe3f0] text-[#f73591] hover:bg-[#f73591] hover:text-white'
                        }`}
                      >
                        {isCopiedShareLink ? (
                          <>
                            <Check className="size-4 md:size-5" />
                            <span>Đã copy!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-4 md:size-5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status or Alerts */}
            <div className="shrink-0 flex flex-col gap-2">
              {guestNotice && (
                <div className="pink-alert flex items-start gap-2.5 text-left bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-2xl text-xs font-bold shadow-sm max-w-2xl mx-auto">
                  <Info className="size-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{guestNotice}</span>
                </div>
              )}

              {(guestSyncStatus || pendingGuestSyncCount > 0) && (
                <div className="pink-alert flex items-start gap-2.5 text-left bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs font-bold shadow-sm max-w-2xl mx-auto">
                  <Info className="size-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{guestSyncStatus || `Có ${pendingGuestSyncCount} phiên ảnh đang được lưu an toàn trên kiosk và chờ đồng bộ.`}</span>
                </div>
              )}

              {guestPrintStatus && (
                <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-xs font-bold max-w-2xl mx-auto shadow-sm">
                  <Sparkles className="size-4 text-emerald-500 animate-pulse" />
                  <span>{guestPrintStatus}</span>
                </div>
              )}

              {guestPrintFallbackAvailable && (
                <div className="pink-print-retry-panel max-w-2xl mx-auto flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={printGuestPhoto}
                    disabled={isGuestPrinting || !guestPreviewUrl}
                    className="pink-outline-btn text-xs px-4"
                  >
                    {isGuestPrinting ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                    Thử in lại
                  </button>
                  <button
                    type="button"
                    onClick={openGuestBrowserPrintFallback}
                    disabled={!guestPreviewUrl}
                    className="pink-outline-btn text-xs px-4"
                  >
                    <Printer className="size-4" />
                    Mở in thủ công
                  </button>
                </div>
              )}

              {guestNewSessionCountdown !== null && (
                <div className="flex justify-center border-t border-pink-100 pt-3 mt-2">
                  <div className="pink-next-session-countdown max-w-md w-full mx-auto text-xs text-pink-700 font-bold">
                    <span>Phiên mới sẽ tự động bắt đầu sau <strong>{guestNewSessionCountdown}</strong> giây</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
    </div>
  );
}
