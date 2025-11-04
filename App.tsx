import React, { useState, useEffect, useRef } from 'react';

import { useChords } from './hooks/useChords';
import { usePracticeSet } from './hooks/usePracticeSet';
import { useRhythm } from './hooks/useRhythm';
import { usePlayback } from './hooks/usePlayback';
import { useRhythmEditor } from './hooks/useRhythmEditor';

import SearchBar from './components/SearchBar';
import PracticeSet from './components/PracticeSet';
import ChordList from './components/ChordList';
import SavedSetsModal from './components/SavedSetsModal';
import SaveSetModal from './components/SaveSetModal';
import RhythmEditorModal from './components/RhythmEditorModal';
import LoadFromUrlModal from './components/LoadFromUrlModal';
import type { Instrument, ChordFromJSON } from './types';

const App: React.FC = () => {
    const [instrument, setInstrument] = useState<Instrument>('ukulele');
    const [viewMode, setViewMode] = useState<'standard' | 'rotated'>('rotated');
    const [isPracticeSetCollapsed, setIsPracticeSetCollapsed] = useState(false);
    const [isLoadUrlModalOpen, setIsLoadUrlModalOpen] = useState(false);

    const { chords, search, setSearch, filteredChords, addUserChords, isLoading } = useChords(instrument);

    const {
        practiceSet,
        setPracticeSet,
        savedSets,
        isSetsModalOpen,
        setSetsModalOpen,
        isSaveSetModalOpen,
        setIsSaveSetModalOpen,
        handleVoicingSelect,
        handleRemoveFromSet,
        handleClearSet,
        handleSaveSet,
        handleConfirmSaveSet,
        handleLoadSet,
        handleDeleteSet,
    } = usePracticeSet();

    useEffect(() => {
        setPracticeSet([]);
    }, [instrument, setPracticeSet]);
    
    const {
        allPatterns,
        activePatternId,
        setActivePatternId,
        bpm,
        setBpm,
        customPatterns,
        setCustomPatterns,
    } = useRhythm();

    const {
        isPlaying,
        isAudioLoading,
        playingChordId,
        playingNoteIndices,
        handlePlaySet,
        handleStopSet,
    } = usePlayback({ practiceSet, allPatterns, activePatternId, bpm, instrument });

    const {
        rhythmEditorProps,
        handleOpenRhythmEditor,
    } = useRhythmEditor({
        allPatterns,
        customPatterns,
        setCustomPatterns,
        setActivePatternId,
        chords,
        viewMode,
        instrument
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLoadChordsClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
             if (event.target) {
                event.target.value = '';
            }
            return;
        }
    
        const promises = Array.from(files).map(file => {
            return new Promise<ChordFromJSON[]>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target?.result;
                        if (typeof content !== 'string') {
                            return reject(new Error('File content is not a string.'));
                        }
                        if (content.trim() === '') {
                            return resolve([]); // Empty file is valid, contains no chords.
                        }
                        const jsonData = JSON.parse(content);
                        if (Array.isArray(jsonData)) {
                             const isValid = jsonData.every(item => typeof item === 'object' && item !== null && 'chord' in item && 'voicings' in item);
                            if (jsonData.length === 0 || isValid) {
                                resolve(jsonData as ChordFromJSON[]);
                            } else {
                                reject(new Error(`File ${file.name} contains invalid chord objects.`));
                            }
                        } else {
                            reject(new Error(`Invalid file format in ${file.name}. Expected a JSON array.`));
                        }
                    } catch (err) {
                        reject(new Error(`Error parsing JSON from ${file.name}: ${err instanceof Error ? err.message : String(err)}`));
                    }
                };
                reader.onerror = () => {
                    reader.abort();
                    reject(new Error(`Error reading file ${file.name}.`));
                };
                reader.readAsText(file);
            });
        });
    
        Promise.all(promises)
            .then(results => {
                const allNewChords = results.flat();
                if (allNewChords.length > 0) {
                    addUserChords(allNewChords);
                    const fileCount = results.filter(r => r.length > 0).length;
                    alert(`Successfully loaded ${allNewChords.length} new chord voicings from ${fileCount} file(s).`);
                } else {
                     alert(`No new chords were found in the selected file(s).`);
                }
            })
            .catch(error => {
                console.error(error);
                alert(error.message);
            });
        
        if (event.target) {
            event.target.value = '';
        }
    };


    const handleExport = () => {
        const data = {
          practiceSet,
          savedSets,
          customPatterns,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'instrument-chords-data.json';
        a.click();
        URL.revokeObjectURL(url);
        alert('Your data has been exported as a JSON file.');
    };

    const handleQuickFilterClick = (root: string) => {
        setSearch(root);
        setTimeout(() => {
            const element = document.getElementById(`chord-group-${root}`);
            if (element) {
                const header = document.getElementById('top-fixed-panel');
                const headerHeight = header ? header.offsetHeight : 100;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerHeight - 20; // 20px padding from top
      
                window.scrollTo({
                     top: offsetPosition,
                     behavior: "smooth"
                });
            }
        }, 0);
    };

    const handleLoadFromUrl = async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
        }
        const jsonData = await response.json();
        
        if (!Array.isArray(jsonData)) {
          throw new Error(`Invalid data format from URL. Expected a JSON array.`);
        }

        const isValid = jsonData.every(item => typeof item === 'object' && item !== null && 'chord' in item && 'voicings' in item);
        if (jsonData.length > 0 && !isValid) {
          throw new Error(`URL content contains invalid chord objects.`);
        }
        
        const allNewChords = jsonData as ChordFromJSON[];
        if (allNewChords.length > 0) {
            addUserChords(allNewChords);
            alert(`Successfully loaded ${allNewChords.length} new chord voicings from URL.`);
            setIsLoadUrlModalOpen(false);
        } else {
             alert(`No new chords were found at the specified URL.`);
        }
      } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : String(error));
      }
    };
    
    return (
        <main className="has-fixed-header">
            <input type="file" ref={fileInputRef} onChange={handleFilesSelected} multiple accept="application/json,.json" style={{ display: 'none' }} />
            <div id="top-fixed-panel">
                <div className="wrap-content">
                    <SearchBar
                        search={search}
                        onSearch={setSearch}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        onOpenSets={() => setSetsModalOpen(true)}
                        onOpenRhythmEditor={handleOpenRhythmEditor}
                        onExport={handleExport}
                        onQuickFilterClick={handleQuickFilterClick}
                        instrument={instrument}
                        setInstrument={setInstrument}
                        onLoadFromFile={handleLoadChordsClick}
                        onLoadFromUrl={() => setIsLoadUrlModalOpen(true)}
                    />
                </div>
            </div>
            <div className="wrap">
                {isLoading ? (
                    <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
                        <p>Loading all instrument chords...</p>
                    </div>
                ) : (
                    <ChordList
                        chords={filteredChords}
                        search={search}
                        viewMode={viewMode}
                        onVoicingSelect={handleVoicingSelect}
                        practiceSet={practiceSet}
                        instrument={instrument}
                    />
                )}
            </div>
            <PracticeSet
                practiceSet={practiceSet}
                setPracticeSet={setPracticeSet}
                onRemoveFromSet={handleRemoveFromSet}
                onClearSet={handleClearSet}
                onSaveSet={handleSaveSet}
                viewMode={viewMode}
                isCollapsed={isPracticeSetCollapsed}
                onToggleCollapse={() => setIsPracticeSetCollapsed(!isPracticeSetCollapsed)}
                onPlaySet={handlePlaySet}
                onStopSet={handleStopSet}
                isPlaying={isPlaying}
                isAudioLoading={isAudioLoading}
                playingChordId={playingChordId}
                playingNoteIndices={playingNoteIndices}
                patterns={allPatterns}
                activePatternId={activePatternId}
                onPatternChange={setActivePatternId}
                bpm={bpm}
                onBpmChange={setBpm}
                onOpenRhythmEditor={handleOpenRhythmEditor}
                instrument={instrument}
            />
            <SavedSetsModal
                isOpen={isSetsModalOpen}
                onClose={() => setSetsModalOpen(false)}
                savedSets={savedSets}
                onLoadSet={handleLoadSet}
                onDeleteSet={handleDeleteSet}
            />
            <SaveSetModal
                isOpen={isSaveSetModalOpen}
                onClose={() => setIsSaveSetModalOpen(false)}
                onSave={handleConfirmSaveSet}
            />
             <LoadFromUrlModal 
                isOpen={isLoadUrlModalOpen}
                onClose={() => setIsLoadUrlModalOpen(false)}
                onLoad={handleLoadFromUrl}
            />
            <RhythmEditorModal {...rhythmEditorProps} />
        </main>
    );
};

export default App;
