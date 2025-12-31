import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Trash2,
  ChevronRight,
  RotateCcw,
  Mic,
  History,
  Dna,
  CheckCircle2,
  XCircle,
  Lightbulb,
  User,
  Square,
  Github
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const App = () => {
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(() => {
    const saved = localStorage.getItem('dream_car_status');
    return saved ? JSON.parse(saved) : null;
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('dream_car_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentView, setCurrentView] = useState('current'); // 'current' or index
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]); // Array of audio levels for waveform
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Real design state managed in browser
  const [designGenome, setDesignGenome] = useState(() => {
    const saved = localStorage.getItem('dream_car_genome');
    return saved ? JSON.parse(saved) : {
      round: 0,
      design_summary: '',
      confirmed_likes: [],
      hard_rejections: [],
      exploration_history: []
    };
  });

  const pollInterval = useRef(null);
  
  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setAudioLevels([]);
      
      // Start visualization
      visualizeAudio();
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Failed to start recording. Please check microphone permissions.");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };
  
  const visualizeAudio = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let lastSampleTime = Date.now();
    const sampleInterval = 100; // Sample every 100ms (10fps for 10 seconds = 100 samples)
    
    const updateVisualization = () => {
      if (!analyserRef.current) return;
      
      const now = Date.now();
      
      // Only sample at 10fps (every 100ms) to get 10 seconds of data
      if (now - lastSampleTime >= sampleInterval) {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
        
        setAudioLevels(prev => {
          const newLevels = [...prev, normalizedLevel];
          // Keep only last 10 seconds (10fps * 10 seconds = 100 samples)
          const maxSamples = 100;
          return newLevels.slice(-maxSamples);
        });
        
        lastSampleTime = now;
      }
      
      // Continue animation if still recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      }
    };
    
    updateVisualization();
  };
  
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const result = await response.json();
      if (result.text) {
        setFeedback(prev => prev + (prev ? ' ' : '') + result.text);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Poll for status
  useEffect(() => {
    if (taskId) {
      pollInterval.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/status/${taskId}`);
          const data = await res.json();
          setStatus(data);

          if (data.status === 'completed') {
            clearInterval(pollInterval.current);
            setIsGenerating(false);
            setTaskId(null);
            // Append to local history
            setHistory(prev => [...prev, data]);
            // Update local genome from backend's thinking
            if (data.updated_state) {
              setDesignGenome(data.updated_state);
            }
          } else if (data.status === 'failed') {
            clearInterval(pollInterval.current);
            setIsGenerating(false);
            setTaskId(null);
            alert("Generation failed: " + data.error);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(pollInterval.current);
  }, [taskId]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('dream_car_history', JSON.stringify(history));
    localStorage.setItem('dream_car_genome', JSON.stringify(designGenome));
    localStorage.setItem('dream_car_status', JSON.stringify(status));
  }, [history, designGenome, status]);

  const handleGenerate = async () => {
    if (!feedback.trim() && designGenome.round > 0) return;

    setIsGenerating(true);
    setStatus({ status: 'queued' });

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback || "Start the initial warm-up round with diverse archetypes.",
          state: designGenome
        })
      });
      const data = await res.json();
      setTaskId(data.task_id);
      setFeedback('');
    } catch (err) {
      console.error("Generation error:", err);
      setIsGenerating(false);
    }
  };

  const currentDisplayData = currentView === 'current' ? status : history[currentView];
  const currentGenome = (currentView === 'current' || !history[currentView]?.updated_state)
    ? designGenome
    : history[currentView].updated_state;

  return (
    <div className="app-container">
      <header>
        <div className="logo">DREAM CAR<span>FINDER</span></div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            className="btn-new-session"
            onClick={() => {
              if (window.confirm("Start a new session? This will clear all history and genome data.")) {
                setHistory([]);
                setStatus(null);
                setDesignGenome({ round: 0, design_summary: '', confirmed_likes: [], hard_rejections: [], exploration_history: [] });
                setCurrentView('current');
                localStorage.removeItem('dream_car_history');
                localStorage.removeItem('dream_car_genome');
                localStorage.removeItem('dream_car_status');
              }
            }}
          >
            <RotateCcw size={14} style={{ marginRight: '8px' }} />
            New Session
          </button>
          <a
            href="https://github.com/grapeot/CarFinder"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-github"
            title="View on GitHub"
          >
            <Github size={18} />
          </a>
        </div>
      </header>

      <div className="main-content">
        <div className="discovery-pane">
          {(!currentDisplayData || (!currentDisplayData.images?.length && !isGenerating)) ? (
            <div className="empty-state">
              <Sparkles size={48} style={{ marginBottom: '20px', opacity: 0.3 }} />
              <h2>Ready to discover your dream car?</h2>
              <p>Type what you like or click generate to start Round 1.</p>
            </div>
          ) : (
            <>
              <div className="section-title">
                Round {currentDisplayData.round} Candidates
                {currentView !== 'current' && <span style={{ color: 'var(--accent)', marginLeft: '10px' }}>(History)</span>}
              </div>
              <div className="grid">
                {currentDisplayData.images?.map((img, i) => (
                  <div key={i} className={`card ${img.type}`}>
                    <div className="img-container">
                      <div className="type-tag">{img.type}</div>
                      <img
                        src={img.url}
                        alt={img.name}
                        className="loaded"
                        onLoad={(e) => e.target.classList.add('loaded')}
                      />
                    </div>
                    <div className="card-info">
                      <h3>{img.name}</h3>
                      <p>{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sidebar">
          <div className="sidebar-item">
            <div className="section-title"><Dna size={16} /> Design Genome</div>

            {currentGenome.design_summary && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  <User size={10} style={{ marginRight: '5px' }} /> AI Summary
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#ccc' }}>
                  <ReactMarkdown>{currentGenome.design_summary}</ReactMarkdown>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>LIKED ELEMENTS</div>
              <div className="tag-list">
                {currentGenome.confirmed_likes.map((like, i) => (
                  <div key={i} className="tag"><CheckCircle2 size={10} color="var(--exploitation)" /> {like}</div>
                ))}
                {currentGenome.confirmed_likes.length === 0 && <span style={{ fontSize: '0.7rem', color: '#555' }}>No data yet</span>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>REJECTED ELEMENTS</div>
              <div className="tag-list">
                {currentGenome.hard_rejections.map((rej, i) => (
                  <div key={i} className="tag"><XCircle size={10} color="#ff6666" /> {rej}</div>
                ))}
                {currentGenome.hard_rejections.length === 0 && <span style={{ fontSize: '0.7rem', color: '#555' }}>No data yet</span>}
              </div>
            </div>
          </div>

          <div className="sidebar-item">
            <div className="section-title"><History size={16} /> Discovery History</div>
            <div className="history-list">
              <div
                className={`history-item ${currentView === 'current' ? 'active' : ''}`}
                onClick={() => setCurrentView('current')}
              >
                Current Round {status?.round || designGenome.round}
              </div>
              {[...history]
                .reverse()
                .filter(h => h.round !== (status?.round || designGenome.round))
                .map((h) => {
                  const originalIndex = history.indexOf(h);
                  return (
                    <div
                      key={originalIndex}
                      className={`history-item ${currentView === originalIndex ? 'active' : ''}`}
                      onClick={() => setCurrentView(originalIndex)}
                    >
                      Round {h.round} Archive
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            <Lightbulb size={16} />
            Tip: Be specific about form, lighting, and materials.
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="input-wrapper">
          {isRecording && (
            <div className="waveform-container">
              <div className="waveform">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="waveform-bar"
                    style={{
                      height: `${Math.max(level * 100, 5)}%`,
                      backgroundColor: `rgba(44, 107, 237, ${0.3 + level * 0.7})`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <textarea
            placeholder={designGenome.round === 0 ? "Describe your ideal car aesthetic or just click Spark to start..." : "Provide feedback on this round..."}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isGenerating || isRecording}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isTranscribing && (
              <div className="transcribing-indicator">
                <div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '8px' }}>Transcribing...</span>
              </div>
            )}
            <button
              className={`btn-voice ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isGenerating || isTranscribing}
              title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start voice input"}
            >
              {isRecording ? <Square size={24} /> : isTranscribing ? <div className="loader" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <Mic size={20} />}
            </button>
          </div>
        </div>
        <button
          className="btn-generate"
          onClick={handleGenerate}
          disabled={isGenerating || isRecording}
        >
          {isGenerating ? <div className="loader" style={{ width: 24, height: 24, borderWidth: 2 }} /> : <Sparkles size={32} />}
        </button>
      </div>

      {isGenerating && (
        <div className="status-overlay">
          <div className="loader"></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>
              {status?.status === 'completed' ? 'Finalizing...' : (status?.status || 'AI Thinking...')}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Synthesizing Design Genome...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
