import React from 'react';
import { ArrowLeft, QrCode, Printer, Wand2 } from 'lucide-react';

export default function GuestSelectScreen({
  isSelectUnlocked,
  isSelectLocked,
  boothMode,
  guestSelectionWarning,
  guestNotice,
  guestStep,
  selectedCaptureIndices,
  idPhotoService,
  setIdPhotoService,
  handleGoToPreviousStep,
  isGeneratingGuestResult,
  guestCanCreateResult,
  requestCreateGuestResult,
  selectedFramesUseDirectFit,
  capturedPhotos,
  toggleGuestPhotoSelection,
  zones
}) {
  return (
    <div className="w-screen h-[100dvh] shrink-0 overflow-hidden relative flex flex-col justify-center items-center pt-[108px] pb-8 px-4 md:px-8" style={{ boxSizing: 'border-box' }}>
      <section id="guest-select" className={`pink-step ${isSelectUnlocked ? 'active' : ''} ${isSelectLocked ? 'locked' : ''} w-full h-full`} data-disabled={!isSelectUnlocked || isSelectLocked}>
        <div className="pink-card p-5 lg:max-w-none w-full h-full flex flex-col justify-between overflow-hidden">
          
          {/* Header section: Title & Subtitle */}
          <div className="flex flex-col gap-2 border-b border-[#ffebf4]/60 pb-4 flex-shrink-0">
            <h2 className="pink-step-headline">
              {boothMode === 'photobooth' ? '3. Chọn ảnh yêu thích' : '2. Chọn ảnh thẻ / CV'}
            </h2>
            <p className="font-bold text-[#74194a] text-xs leading-relaxed">
              {boothMode === 'photobooth'
                ? (selectedFramesUseDirectFit
                  ? 'Máy sẽ đặt ảnh vào đúng các ô chữ nhật trong khung.'
                  : 'Bạn có thể giữ nguyên hoặc thay áo mới bằng những tấm ảnh khác trước khi tụi mình cùng căn chỉnh nha! ✨')
                : 'Chạm vào tấm ảnh bạn ưng ý nhất để làm ảnh thẻ / CV và chọn hình thức nhận ảnh bên dưới nhé! ✨'}
            </p>
          </div>

          {/* Warnings & Notices */}
          {guestSelectionWarning && boothMode === 'photobooth' && <p className="pink-alert text-xs my-2 flex-shrink-0">{guestSelectionWarning}</p>}
          {guestNotice && guestStep === 'select' && <p className="pink-alert text-xs my-2 flex-shrink-0">{guestNotice}</p>}
          
          {/* Full-width Grid content area */}
          <div className="pink-selection-panel flex-1 overflow-y-auto my-4 w-full">
            <div className="pink-selection-grid">
              {capturedPhotos.map((photo, index) => {
                const selectionOrder = selectedCaptureIndices.indexOf(index);
                const isSelected = selectionOrder >= 0;
                return (
                  <button type="button"
                    key={photo.id}
                    onClick={() => toggleGuestPhotoSelection(index)}
                    className={`pink-select-item ${isSelected ? 'selected' : ''} cursor-pointer`}
                    style={{
                      aspectRatio: (boothMode === 'photobooth' && zones[0]) ? `${zones[0].width} / ${zones[0].height}` : '4 / 3'
                    }}
                  >
                    <img src={photo.previewUrl || photo.url} alt={photo.name} />
                    <span>{isSelected ? (boothMode === 'photobooth' ? selectionOrder + 1 : '✓') : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery options (ID photo only) */}
          {boothMode !== 'photobooth' && (
            <div className="mb-4 text-left bg-white/60 border border-[#ffc6e2]/20 rounded-2xl p-4 flex-shrink-0">
              <h3 className="font-extrabold text-[#74194a] text-xs mb-2.5">Hình thức nhận ảnh:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIdPhotoService('digital')}
                  className={`pink-delivery-option py-2.5 px-4 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                    idPhotoService === 'digital' 
                      ? 'border-[#ff2f93] bg-[#fff7fb] shadow-sm' 
                      : 'border-[#ffc6e2]/40 bg-white hover:border-[#ffc6e2]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="size-4 text-[#ff2f93]" />
                    <div className="leading-tight">
                      <strong className="text-xs text-[#5c0f38] block font-black">Chỉ nhận file ảnh</strong>
                      <span className="text-[10px] text-slate-400">Tải file ảnh thẻ 3x4 qua mã QR.</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#ff2f93]">15.000đ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdPhotoService('print')}
                  className={`pink-delivery-option py-2.5 px-4 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                    idPhotoService === 'print' 
                      ? 'border-[#ff2f93] bg-[#fff7fb] shadow-sm' 
                      : 'border-[#ffc6e2]/40 bg-white hover:border-[#ffc6e2]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Printer className="size-4 text-[#ff2f93]" />
                    <div className="leading-tight">
                      <strong className="text-xs text-[#5c0f38] block font-black">Rửa ảnh lấy ngay & file</strong>
                      <span className="text-[10px] text-slate-400">Rửa bản in và tải file qua QR.</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#ff2f93]">50.000đ</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Control Row: Navigation buttons and selection status badge */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#ffebf4]/60 flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGoToPreviousStep}
                disabled={isGeneratingGuestResult}
                className="pink-outline-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 px-6 text-xs cursor-pointer"
              >
                <ArrowLeft className="size-4" /> Quay lại
              </button>
              <button 
                type="button"
                onClick={() => requestCreateGuestResult()}
                disabled={!guestCanCreateResult || isGeneratingGuestResult}
                className="pink-btn flex-1 sm:flex-initial py-2.5 px-6 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wand2 className="size-4" />
                {boothMode !== 'photobooth'
                  ? 'Xác nhận'
                  : (selectedFramesUseDirectFit ? 'Ghép ảnh' : 'Qua căn chỉnh')}
              </button>
            </div>

            <div className="py-2 px-5 bg-[#fff7fb] border border-[#ffebf4]/60 rounded-full text-center flex items-center justify-center gap-3 w-full sm:w-auto shadow-sm">
              <span className="text-sm font-extrabold text-[#74194a]">
                {selectedCaptureIndices.length} ảnh đã chọn
              </span>
              <span className="hidden md:inline text-xs text-slate-500 font-bold border-l pl-3 border-slate-200">
                {boothMode === 'photobooth' ? 'Chọn theo đúng thứ tự muốn lên khung' : 'Chọn đúng 1 ảnh thẻ đẹp nhất'}
              </span>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
