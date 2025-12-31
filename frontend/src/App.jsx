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
  User
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
        <div style={{ display: 'flex', gap: '15px' }}>
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
          <textarea
            placeholder={designGenome.round === 0 ? "Describe your ideal car aesthetic or just click Spark to start..." : "Provide feedback on this round..."}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', display: 'flex', gap: '10px' }}>
            <button className="tag" style={{ border: 'none', background: 'transparent' }} title="Voice input coming soon">
              <Mic size={20} color="#555" />
            </button>
          </div>
        </div>
        <button
          className="btn-generate"
          onClick={handleGenerate}
          disabled={isGenerating}
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
