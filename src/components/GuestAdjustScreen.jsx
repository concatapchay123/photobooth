import React from 'react';
import { SlidersHorizontal, Wand2, RefreshCcw, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, ArrowLeftRight, ArrowLeft } from 'lucide-react';

export default function GuestAdjustScreen({
  isAdjustUnlocked,
  isAdjustLocked,
  boothMode,
  activeAdjustDraft,
  selectedFrame,
  guestFrameDrafts,
  selectedAdjustFrameIndex,
  slotEdits,
  selectedAdjustSlotIndex,
  activateGuestFrameDraft,
  isGeneratingGuestResult,
  frameRatio,
  zones,
  extractSlotStyle,
  frameDimensions,
  startAdjustDrag,
  setSelectedAdjustSlotIndex,
  canEditGuestAdjustment,
  extractPhotoStyle,
  originalFrame,
  extractZoomValue,
  extractZoomScale,
  updateSlotEdit,
  extractRotationValue,
  autoFitSlotEdit,
  resetSlotEdit,
  swapSlotEdits,
  handleGoToPreviousStep,
  requestFinishGuestAdjustment,
  isAdjustTimeOver
}) {
  const [activeTab, setActiveTab] = React.useState('basic'); // 'basic' | 'quick'
  return (
    <div className="w-screen h-[100dvh] shrink-0 overflow-hidden relative flex flex-col justify-center items-center pt-[108px] pb-8 px-4 md:px-8" style={{ boxSizing: 'border-box' }}>
      <section id="guest-adjust" className={`pink-step ${isAdjustUnlocked ? 'active' : ''} ${isAdjustLocked ? 'locked' : ''}`} data-disabled={!isAdjustUnlocked || isAdjustLocked} style={boothMode !== 'photobooth' ? { display: 'none' } : {}}>
          <div className="pink-card p-5 w-full h-full flex flex-col justify-between">
            <div className="mb-4 flex justify-between items-center gap-4 border-b border-pink-100/60 pb-3 shrink-0">
              <div className="text-left">
                <h2 className="pink-step-headline">4. Căn chỉnh ảnh</h2>
                <p className="font-bold text-[#74194a] text-xs mt-1 leading-relaxed">
                  Kéo di chuyển và thu phóng ảnh trong từng ô để có bố cục đẹp nhất nhe ✨
                </p>
              </div>
            </div>
            
            <div className="pink-adjust-layout overflow-hidden flex-1">
              {/* Left Pane: Interactive Preview */}
              <div className="pink-adjust-stage h-full">
                <div className="pink-adjust-stage-head">
                  <strong>{activeAdjustDraft?.frame?.name || selectedFrame?.name || 'Khung đang chỉnh'}</strong>
                  <div className="flex items-center gap-2">
                    {guestFrameDrafts.length > 1 && (
                      <span className="pink-adjust-mini-badge text-[10px] text-white/90">Khung {Math.min(selectedAdjustFrameIndex + 1, guestFrameDrafts.length || 1)}/{guestFrameDrafts.length || 1}</span>
                    )}
                    <span className="pink-adjust-mini-badge text-[10px] text-white/90 font-black">Slot {Math.min(selectedAdjustSlotIndex + 1, slotEdits.length || 1)}/{slotEdits.length || 0}</span>
                  </div>
                </div>
                
                {guestFrameDrafts.length > 1 && (
                  <div className="pink-adjust-frame-tabs absolute bottom-5 left-5 z-10 flex gap-2" aria-label="Chọn khung để căn chỉnh">
                    {guestFrameDrafts.map((draft, index) => (
                      <button
                        key={draft.id}
                        type="button"
                        onClick={() => activateGuestFrameDraft(index)}
                        disabled={isGeneratingGuestResult}
                        className={`flex items-center gap-1.5 px-3 py-1 bg-black/60 text-white rounded-full text-xs hover:bg-black/80 transition-colors ${selectedAdjustFrameIndex === index ? 'active border border-white' : ''}`}
                      >
                        <span>K{index + 1}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className="pink-adjust-frame-preview"
                  style={{
                    '--frame-ratio': frameRatio,
                    aspectRatio: frameRatio,
                  }}
                >
                  {slotEdits.map((edit) => {
                    const zone = zones[edit.slotIndex];
                    if (!zone) return null;
                    return (
                      <button
                        key={edit.photoId}
                        type="button"
                        className={`pink-adjust-slot ${selectedAdjustSlotIndex === edit.slotIndex ? 'active' : ''}`}
                        style={extractSlotStyle(zone, frameDimensions)}
                        onPointerDown={(event) => startAdjustDrag(event, edit.slotIndex, 'full')}
                        onClick={() => setSelectedAdjustSlotIndex(edit.slotIndex)}
                        disabled={!canEditGuestAdjustment}
                      >
                        <img src={edit.url} alt={edit.name} draggable="false" style={extractPhotoStyle(edit, zone)} />
                      </button>
                    );
                  })}
                  {originalFrame && <img src={originalFrame} alt="Khung đã chọn" className="pink-adjust-frame-overlay" draggable="false" />}
                  {!canEditGuestAdjustment && (
                    <div className="pink-adjust-lock-layer">
                      {isGeneratingGuestResult ? 'Đang tạo bản in…' : isAdjustLocked ? 'Bản chỉnh đã chốt' : 'Hết giờ, máy đang chốt'}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Control workspace panel */}
              <div className="pink-adjust-panel h-full overflow-y-auto">
                {(() => {
                  const edit = slotEdits.find((item) => item.slotIndex === selectedAdjustSlotIndex) || slotEdits[0];
                  const zone = edit ? zones[edit.slotIndex] : null;
                  if (!edit || !zone) return <p className="font-black text-pink-500">Chưa có slot để chỉnh.</p>;
                  const zoomValue = extractZoomValue(edit);
                  return (
                    <>
                      <div className="pink-adjust-panel-title">
                        <SlidersHorizontal className="size-5 shrink-0" />
                        <div>
                          <h3>Căn chỉnh ảnh ô {edit.slotIndex + 1}</h3>
                          <span>Tự do thu phóng, xoay, lật & đổi vị trí</span>
                        </div>
                      </div>

                      <div className="pink-adjust-slot-tabs" aria-label="Chọn ô ảnh">
                        {slotEdits.map((item) => (
                          <button
                            key={`slot-tab-${item.photoId}`}
                            type="button"
                            onClick={() => setSelectedAdjustSlotIndex(item.slotIndex)}
                            className={selectedAdjustSlotIndex === item.slotIndex ? 'active' : ''}
                          >
                            Ảnh {item.slotIndex + 1}
                          </button>
                        ))}
                      </div>

                      <div
                        className="pink-adjust-zoom-preview mx-auto"
                        style={{
                          '--slot-ratio': zone.width / Math.max(1, zone.height),
                          aspectRatio: 'var(--slot-ratio)',
                          maxWidth: '100%',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '16px',
                          border: '2px solid #ffd5e9',
                          background: '#000',
                          marginBottom: '1.25rem',
                          cursor: 'grab'
                        }}
                        onPointerDown={(event) => startAdjustDrag(event, edit.slotIndex, 'zoom')}
                      >
                        <img src={edit.url} alt={edit.name} draggable="false" style={extractPhotoStyle(edit, zone)} />
                      </div>

                      {/* Compact accordion/tabs structure */}
                      <div className="flex border-b border-pink-100/80 mb-4 bg-pink-50/40 rounded-lg p-0.5 shrink-0" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeTab === 'basic'}
                          onClick={() => setActiveTab('basic')}
                          className={`flex-1 py-2 text-xs font-black rounded-md transition-all text-center cursor-pointer ${
                            activeTab === 'basic' 
                              ? 'bg-white text-[#ff2f93] shadow-sm border border-[#ffebf4]' 
                              : 'text-[#74194a] opacity-70 hover:opacity-100'
                          }`}
                        >
                          Cân Chỉnh Tay
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeTab === 'quick'}
                          onClick={() => setActiveTab('quick')}
                          className={`flex-1 py-2 text-xs font-black rounded-md transition-all text-center cursor-pointer ${
                            activeTab === 'quick' 
                              ? 'bg-white text-[#ff2f93] shadow-sm border border-[#ffebf4]' 
                              : 'text-[#74194a] opacity-70 hover:opacity-100'
                          }`}
                        >
                          Công Cụ Nhanh
                        </button>
                      </div>

                      {activeTab === 'basic' && (
                        <div className="bg-[#fff7fb] border border-[#ffebf4] rounded-2xl p-4 flex flex-col gap-3">
                          <label className="pink-adjust-control m-0">
                            <span className="flex justify-between text-xs font-bold text-[#74194a] mb-1">
                              <b>Phóng to</b>
                              <em>{zoomValue}%</em>
                            </span>
                            <input disabled={!canEditGuestAdjustment} type="range" min="20" max="600" step="1" value={zoomValue} aria-label="Adjust slot zoom" onChange={(event) => updateSlotEdit(edit.slotIndex, { scale: extractZoomScale(edit, event.target.value) })} className="w-full accent-[#ff2f93]" />
                          </label>
                          <label className="pink-adjust-control m-0">
                            <span className="flex justify-between text-xs font-bold text-[#74194a] mb-1">
                              <b>Xoay tự do</b>
                              <em>{extractRotationValue(edit)}°</em>
                            </span>
                            <input disabled={!canEditGuestAdjustment} type="range" min="-180" max="180" step="1" value={extractRotationValue(edit)} aria-label="Adjust slot rotation" onChange={(event) => updateSlotEdit(edit.slotIndex, { rotation: Number(event.target.value) })} className="w-full accent-[#ff2f93]" />
                          </label>
                        </div>
                      )}

                      {activeTab === 'quick' && (
                        <div className="flex flex-col gap-3">
                          <div className="bg-white border border-pink-100 rounded-2xl p-4 flex flex-col gap-2">
                            <span className="text-[10px] font-black text-[#74194a] uppercase tracking-wider mb-1">Công cụ căn chỉnh nhanh:</span>
                            <div className="grid grid-cols-3 gap-2">
                              <button type="button" className="flex flex-col items-center justify-center py-2 px-1 border border-pink-100/60 rounded-xl hover:bg-[#fff7fb] hover:border-[#ff2f93] text-[10px] font-bold text-[#74194a] cursor-pointer transition-all active:scale-95" disabled={!canEditGuestAdjustment} onClick={() => autoFitSlotEdit(edit.slotIndex)} title="Tự động căn chỉnh">
                                <Wand2 className="size-4 mb-1 text-[#ff2f93]" /><span>Tự căn</span>
                              </button>
                              <button type="button" className="flex flex-col items-center justify-center py-2 px-1 border border-pink-100/60 rounded-xl hover:bg-[#fff7fb] hover:border-[#ff2f93] text-[10px] font-bold text-[#74194a] cursor-pointer transition-all active:scale-95" disabled={!canEditGuestAdjustment} onClick={() => resetSlotEdit(edit.slotIndex)} title="Đặt lại như cũ">
                                <RefreshCcw className="size-4 mb-1 text-[#ff2f93]" /><span>Đặt lại</span>
                              </button>
                              <button type="button" className="flex flex-col items-center justify-center py-2 px-1 border border-pink-100/60 rounded-xl hover:bg-[#fff7fb] hover:border-[#ff2f93] text-[10px] font-bold text-[#74194a] cursor-pointer transition-all active:scale-95" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { rotation: (edit.rotation || 0) - 90 })} title="Xoay trái 90 độ">
                                <RotateCcw className="size-4 mb-1 text-[#ff2f93]" /><span>Xoay Trái</span>
                              </button>
                              <button type="button" className="flex flex-col items-center justify-center py-2 px-1 border border-pink-100/60 rounded-xl hover:bg-[#fff7fb] hover:border-[#ff2f93] text-[10px] font-bold text-[#74194a] cursor-pointer transition-all active:scale-95" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { rotation: (edit.rotation || 0) + 90 })} title="Xoay phải 90 độ">
                                <RotateCw className="size-4 mb-1 text-[#ff2f93]" /><span>Xoay Phải</span>
                              </button>
                              <button type="button" className="flex flex-col items-center justify-center py-2 px-1 border border-pink-100/60 rounded-xl hover:bg-[#fff7fb] hover:border-[#ff2f93] text-[10px] font-bold text-[#74194a] cursor-pointer transition-all active:scale-95" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { flipX: !edit.flipX })} title="Lật ngang">
                                <FlipHorizontal className="size-4 mb-1 text-[#ff2f93]" /><span>Lật Ngang</span>
                              </button>
                              <button type="button" className="flex flex-col items-center justify-center py-2 px-1 border border-pink-100/60 rounded-xl hover:bg-[#fff7fb] hover:border-[#ff2f93] text-[10px] font-bold text-[#74194a] cursor-pointer transition-all active:scale-95" disabled={!canEditGuestAdjustment} onClick={() => updateSlotEdit(edit.slotIndex, { flipY: !edit.flipY })} title="Lật dọc">
                                <FlipVertical className="size-4 mb-1 text-[#ff2f93]" /><span>Lật Dọc</span>
                              </button>
                            </div>
                          </div>
                          {slotEdits.length > 1 && (
                            <div className="pink-swap-panel bg-[#fff7fb] border border-[#ffebf4] rounded-2xl p-4">
                              <p className="text-xs font-black text-[#74194a] flex items-center gap-1.5 mb-2"><ArrowLeftRight className="size-4 text-[#ff2f93]" /> Đổi ảnh sang ô khác</p>
                              <div className="pink-swap-grid flex flex-wrap gap-2">
                                {slotEdits.flatMap((item) => (item.slotIndex === edit.slotIndex ? [] : [
                                  (
                                    <button
                                      key={`swap-${edit.slotIndex}-${item.slotIndex}`}
                                      type="button"
                                      disabled={!canEditGuestAdjustment}
                                      onClick={() => swapSlotEdits(edit.slotIndex, item.slotIndex)}
                                      className="px-3 py-1.5 bg-white border border-[#ffc6e2] hover:border-[#ff2f93] rounded-full text-xs font-bold text-[#74194a] cursor-pointer"
                                    >
                                      Ô số {item.slotIndex + 1}
                                    </button>
                                  ),
                                ]))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="mt-4 flex gap-3 justify-between items-center shrink-0">
              <button
                type="button"
                onClick={handleGoToPreviousStep}
                disabled={isGeneratingGuestResult}
                className="pink-outline-btn flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="size-5" /> Quay lại chọn ảnh
              </button>
              <button type="button" onClick={requestFinishGuestAdjustment} disabled={!slotEdits.length || isGeneratingGuestResult || isAdjustTimeOver} className="pink-btn disabled:opacity-40 cursor-pointer">
                <Wand2 className="size-5" /> Chốt bản in
              </button>
            </div>
          </div>
        </section>
    </div>
  );
}
