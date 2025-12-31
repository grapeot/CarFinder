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
  Lightbulb
} from 'lucide-react';

const App = () => {
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentView, setCurrentView] = useState('current'); // 'current' or index

  // Real design state managed in browser
  const [designGenome, setDesignGenome] = useState({
    round: 0,
    confirmed_likes: [],
    hard_rejections: [],
    exploration_history: []
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

  return (
    <div className="app-container">
      <header>
        <div className="logo">CAR<span>FINDER</span></div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            className="tag"
            style={{ cursor: 'pointer', borderColor: 'var(--accent)' }}
            onClick={() => {
              if (window.confirm("Are you sure you want to reset everything?")) {
                setHistory([]);
                setStatus(null);
                setDesignGenome({ round: 0, confirmed_likes: [], hard_rejections: [], exploration_history: [] });
              }
            }}
          >
            <RotateCcw size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
            Reset
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
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>LIKED ELEMENTS</div>
              <div className="tag-list">
                {designGenome.confirmed_likes.map((like, i) => (
                  <div key={i} className="tag"><CheckCircle2 size={10} color="var(--exploitation)" /> {like}</div>
                ))}
                {designGenome.confirmed_likes.length === 0 && <span style={{ fontSize: '0.7rem', color: '#555' }}>No data yet</span>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '5px' }}>REJECTED ELEMENTS</div>
              <div className="tag-list">
                {designGenome.hard_rejections.map((rej, i) => (
                  <div key={i} className="tag"><XCircle size={10} color="#ff6666" /> {rej}</div>
                ))}
                {designGenome.hard_rejections.length === 0 && <span style={{ fontSize: '0.7rem', color: '#555' }}>No data yet</span>}
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
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`history-item ${currentView === i ? 'active' : ''}`}
                  onClick={() => setCurrentView(i)}
                >
                  Round {h.round} Archive
                </div>
              ))}
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
            onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleGenerate()}
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
          <h2 style={{ letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 300 }}>
            {status?.status === 'completed' ? 'Finalizing...' : (status?.status || 'AI is thinking...')}
          </h2>
          <p style={{ color: 'var(--text-dim)' }}>
            Synthesizing your design genome and rendering prototypes...
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
