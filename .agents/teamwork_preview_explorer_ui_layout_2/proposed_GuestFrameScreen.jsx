import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Search, Sparkles } from 'lucide-react';

export default function GuestFrameScreen({
  isFrameUnlocked,
  isFrameLocked,
  boothMode,
  selectedFrame,
  selectedGuestFrameCount,
  GUEST_FRAME_CHOOSE_TARGET,
  handleGoToPreviousStep,
  isCommittingGuestFrames,
  isGeneratingGuestResult,
  requestGuestFrameSelectionCommit,
  frameSearchQuery,
  setFrameSearchQuery,
  safeGuestFramePageIndex,
  guestFramePageCount,
  filteredFramePreviewCards,
  guestFramePageStart,
  guestFramePageEnd,
  goToGuestFramePage,
  guestNotice,
  guestStep,
  pagedFramePreviewCards,
  getSelectedGuestFrameIndices,
  recommendedFrameKeys,
  selectGuestFrame,
  isBuildingFramePreviews
}) {
  return (
    <div className="w-screen h-[100dvh] shrink-0 overflow-hidden relative flex flex-col justify-center items-center pt-[108px] pb-8 px-4 md:px-8" style={{ boxSizing: 'border-box' }}>
      <section id="guest-frame" className={`pink-step ${isFrameUnlocked ? 'active' : ''} ${isFrameLocked ? 'locked' : ''} w-full h-full`} data-disabled={!isFrameUnlocked || isFrameLocked} style={boothMode !== 'photobooth' ? { display: 'none' } : {}}>
        <div className="pink-card p-5 lg:max-w-none w-full h-full flex flex-col justify-between overflow-hidden">
          
          {/* Header section: Title, Subtitle, Search and Pagination controls in a single clean row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ffebf4]/60 pb-4 flex-shrink-0">
            <div>
              <h2 className="pink-step-headline">2. Chọn khung</h2>
              <p className="font-bold text-[#74194a] text-xs mt-1 leading-relaxed">
                Xem trước các khung hình, rồi chọn mẫu ưng ý nhất nha bạn yêu 💖
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Tìm kiếm khung..."
                  value={frameSearchQuery}
                  onChange={(e) => setFrameSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-10 rounded-full border border-[#f4b5d6] focus:outline-none focus:ring-2 focus:ring-[#f73591] bg-white text-[#74194a] text-sm font-semibold shadow-inner placeholder:text-[#f4b5d6] disabled:opacity-50"
                  disabled={isCommittingGuestFrames || isGeneratingGuestResult}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#ff2f93]" />
              </div>

              {/* Pagination page bar */}
              <div className="pink-frame-page-bar m-0 flex items-center bg-white border border-[#ffc6e2]/40 rounded-full py-1.5 px-4 shadow-sm">
                <div className="text-right mr-3">
                  <strong className="text-xs text-[#74194a]">Trang {safeGuestFramePageIndex + 1}/{guestFramePageCount}</strong>
                  <span className="block text-[10px] opacity-70 text-slate-500">{filteredFramePreviewCards.length > 0 ? `${guestFramePageStart + 1}-${guestFramePageEnd} / ${filteredFramePreviewCards.length} khung` : 'Đang tải'}</span>
                </div>
                <div className="pink-frame-page-actions m-0 flex gap-1">
                  <button
                    type="button"
                    onClick={() => goToGuestFramePage(safeGuestFramePageIndex - 1)}
                    disabled={safeGuestFramePageIndex <= 0 || isCommittingGuestFrames || isGeneratingGuestResult}
                    aria-label="Trang trước"
                    title="Trang trước"
                    className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-[#ff2f93]"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToGuestFramePage(safeGuestFramePageIndex + 1)}
                    disabled={safeGuestFramePageIndex >= guestFramePageCount - 1 || isCommittingGuestFrames || isGeneratingGuestResult}
                    aria-label="Trang sau"
                    title="Trang sau"
                    className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-[#ff2f93]"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notices & loading states */}
          {guestNotice && guestStep === 'frame' && <p className="pink-alert my-2 flex-shrink-0">{guestNotice}</p>}

          {(isCommittingGuestFrames || isGeneratingGuestResult) && (
            <div className="pink-status py-2 my-2 flex-shrink-0">
              {isCommittingGuestFrames
                ? 'Đang chuẩn bị khung đã chọn…'
                : 'Đang chuẩn bị ảnh để qua phần căn chỉnh…'}
            </div>
          )}

          {/* Full-width Grid content area */}
          <div className="pink-frame-grid pink-frame-library-grid pink-frame-preview-grid flex-1 overflow-y-auto my-4 w-full">
            {pagedFramePreviewCards.map((card) => {
              const selectionIndices = getSelectedGuestFrameIndices(card.frame);
              const isSelected = selectionIndices.length > 0;
              const isRecommended = recommendedFrameKeys.has(card.key);
              return (
                <button type="button"
                  key={card.key}
                  onClick={() => selectGuestFrame(card.frame)}
                  disabled={isCommittingGuestFrames || isGeneratingGuestResult}
                  className={`pink-frame-choice auto-preview ${isRecommended ? 'recommended' : ''} ${card.isComposed ? 'composed' : ''} ${isSelected ? 'selected' : ''} cursor-pointer`}
                  title={card.frame.name}
                >
                  <div className="pink-frame-thumb">
                    <img src={card.previewUrl || card.frame.url} alt={card.frame.name} loading="lazy" />
                    {isRecommended && (
                      <div className="pink-recommended-badge">
                        <Sparkles className="size-3" /> Đề xuất
                      </div>
                    )}
                    {isSelected && (
                      <div className="pink-frame-selected-badge bg-[#f73591] text-white flex items-center justify-center font-bold">
                        ✓
                      </div>
                    )}
                    {!card.isComposed && isBuildingFramePreviews && (
                      <div className="pink-frame-preview-loading">
                        <Loader2 className="size-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className="pink-frame-label">{isSelected ? 'Khung đã chọn' : isRecommended ? card.frame.name : card.isComposed ? card.frame.name : card.status}</span>
                  <span className="pink-frame-preview-name">{card.frame.slotCount ? `${card.frame.slotCount} slot` : 'Tự nhận diện'}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Control Row: Navigation buttons and selection status badge */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#ffebf4]/60 flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGoToPreviousStep}
                disabled={isCommittingGuestFrames || isGeneratingGuestResult}
                className="pink-outline-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 px-6 text-xs cursor-pointer"
              >
                <ArrowLeft className="size-4" /> Quay lại
              </button>
              <button
                type="button"
                onClick={requestGuestFrameSelectionCommit}
                disabled={selectedGuestFrameCount < GUEST_FRAME_CHOOSE_TARGET || isCommittingGuestFrames || isGeneratingGuestResult}
                className="pink-btn flex-1 sm:flex-initial py-2.5 px-6 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Chốt khung
              </button>
            </div>

            <div className="py-2 px-5 bg-[#fff7fb] border border-[#ffebf4]/60 rounded-full text-center flex items-center justify-center gap-3 w-full sm:w-auto shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#74194a]">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>{selectedGuestFrameCount}/{GUEST_FRAME_CHOOSE_TARGET} đã chọn</span>
              </div>
              <span className="hidden md:inline text-xs text-slate-500 font-bold border-l pl-3 border-slate-200">Hãy chọn khung hình bạn thích</span>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
