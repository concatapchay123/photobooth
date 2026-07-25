const fs = require('fs');
const file = 'src/App.jsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const startLine = 8940 - 1; // 0-indexed
const endLine = 9069; // 0-indexed, exclusive in array slice, but inclusive if we mean endLine

const replacement = `      <GuestSelectScreen
        isSelectUnlocked={isSelectUnlocked}
        isSelectLocked={isSelectLocked}
        boothMode={boothMode}
        guestSelectionWarning={guestSelectionWarning}
        guestNotice={guestNotice}
        guestStep={guestStep}
        selectedCaptureIndices={selectedCaptureIndices}
        idPhotoService={idPhotoService}
        setIdPhotoService={setIdPhotoService}
        handleGoToPreviousStep={handleGoToPreviousStep}
        isGeneratingGuestResult={isGeneratingGuestResult}
        guestCanCreateResult={guestCanCreateResult}
        requestCreateGuestResult={requestCreateGuestResult}
        selectedFramesUseDirectFit={selectedFramesUseDirectFit}
        capturedPhotos={capturedPhotos}
        toggleGuestPhotoSelection={toggleGuestPhotoSelection}
        zones={zones}
      />`;

lines.splice(startLine, endLine - startLine, replacement);
fs.writeFileSync(file, lines.join('\n'));
console.log('SelectScreen replaced!');
