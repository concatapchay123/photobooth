const fs = require('fs');
const file = 'src/App.jsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const startLine = 8961 - 1; // 0-indexed
const endLine = 9148; 

const replacement = `      <GuestAdjustScreen
        isAdjustUnlocked={isAdjustUnlocked}
        isAdjustLocked={isAdjustLocked}
        boothMode={boothMode}
        activeAdjustDraft={activeAdjustDraft}
        selectedFrame={selectedFrame}
        guestFrameDrafts={guestFrameDrafts}
        selectedAdjustFrameIndex={selectedAdjustFrameIndex}
        slotEdits={slotEdits}
        selectedAdjustSlotIndex={selectedAdjustSlotIndex}
        activateGuestFrameDraft={activateGuestFrameDraft}
        isGeneratingGuestResult={isGeneratingGuestResult}
        frameRatio={frameRatio}
        zones={zones}
        extractSlotStyle={extractSlotStyle}
        frameDimensions={frameDimensions}
        startAdjustDrag={startAdjustDrag}
        setSelectedAdjustSlotIndex={setSelectedAdjustSlotIndex}
        canEditGuestAdjustment={canEditGuestAdjustment}
        extractPhotoStyle={extractPhotoStyle}
        originalFrame={originalFrame}
        extractZoomValue={extractZoomValue}
        extractZoomScale={extractZoomScale}
        updateSlotEdit={updateSlotEdit}
        extractRotationValue={extractRotationValue}
        autoFitSlotEdit={autoFitSlotEdit}
        resetSlotEdit={resetSlotEdit}
        swapSlotEdits={swapSlotEdits}
        handleGoToPreviousStep={handleGoToPreviousStep}
        requestFinishGuestAdjustment={requestFinishGuestAdjustment}
        isAdjustTimeOver={isAdjustTimeOver}
      />`;

lines.splice(startLine, endLine - startLine, replacement);
fs.writeFileSync(file, lines.join('\n'));
console.log('AdjustScreen replaced!');
