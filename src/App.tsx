import React, { useState, useEffect, ErrorInfo, ReactNode, Component } from 'react';
import { Crown, Play, RotateCcw, Trophy, User, Skull, ShieldCheck, ShieldAlert, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Game from './components/Game';
import { db, collection, addDoc, query, orderBy, limit, onSnapshot, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface LeaderboardEntry {
  username: string;
  score: number;
  survival_time: number;
  created_at: string;
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { children } = this.props;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
          <div className="text-center max-w-md">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Đã có lỗi xảy ra</h1>
            <p className="text-gray-400 mb-6">Chúng tôi xin lỗi vì sự bất tiện này. Vui lòng tải lại trang.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-black font-bold px-6 py-2 rounded-lg"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return children;
  }
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [username, setUsername] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [difficulty, setDifficulty] = useState(1);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time leaderboard with Firestore
  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
      setLeaderboard(entries);
    }, (error) => {
      console.error("Firestore Error: ", JSON.stringify({
        error: error.message,
        operationType: 'get',
        path: 'scores'
      }));
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // Save score to Firestore
  const saveScore = async (score: number, time: number) => {
    if (!username || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'scores'), {
        username,
        score,
        survival_time: time,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Firestore Error: ", JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        operationType: 'create',
        path: 'scores'
      }));
    }
  };

  const handleGameOver = (score: number, time: number) => {
    setFinalScore(score);
    setFinalTime(time);
    setGameState('gameover');
    saveScore(score, time);
  };

  const startGame = () => {
    if (!username.trim()) {
      alert('Vui lòng nhập tên người chơi!');
      return;
    }
    setGameState('playing');
    setDifficulty(1);
  };

  // Increase difficulty over time
  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setDifficulty(prev => prev + 1);
      }, 15000); // Increase difficulty every 15s
      return () => clearInterval(interval);
    }
  }, [gameState]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500/30">
        <AnimatePresence mode="wait">
          {gameState === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-screen p-6"
            >
              <div className="text-center mb-12">
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="inline-block mb-4"
                >
                  <Crown className="w-24 h-24 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                </motion.div>
                <h1 className="text-6xl font-black tracking-tighter uppercase mb-2">Bảo Vệ Nhà Vua</h1>
                <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">King's Guard: Assassin Hunt</p>
              </div>

              <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-xl mb-12">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <User className="w-3 h-3" /> Tên Người Chơi
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên của bạn..."
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors font-mono"
                    />
                  </div>
                  <button
                    onClick={startGame}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                  >
                    <Play className="w-5 h-5 fill-current" /> BẮT ĐẦU CHƠI
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="w-full max-w-2xl">
                <div className="flex items-center gap-2 mb-4 px-4">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Bảng Xếp Hạng Top 10 (Online)</h2>
                </div>
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden">
                  <table className="w-full text-left font-mono text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-400">#</th>
                        <th className="px-6 py-4 font-bold text-gray-400">Người Chơi</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-right">Điểm</th>
                        <th className="px-6 py-4 font-bold text-gray-400 text-right">Thời Gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {leaderboard.length > 0 ? (
                        leaderboard.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                            <td className="px-6 py-4 font-bold">{entry.username}</td>
                            <td className="px-6 py-4 text-right text-yellow-500 font-bold">{entry.score}</td>
                            <td className="px-6 py-4 text-right text-gray-400">{entry.survival_time}s</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-600 italic">Chưa có dữ liệu...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen w-full"
            >
              <Game onGameOver={handleGameOver} difficulty={difficulty} />
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
            >
              <div className="mb-8">
                <ShieldAlert className="w-24 h-24 text-red-500 mx-auto mb-4 animate-pulse" />
                <h1 className="text-7xl font-black tracking-tighter uppercase text-red-500">GAME OVER</h1>
                <p className="text-gray-400 font-mono mt-2">Nhà vua đã bị ám sát hoặc bạn đã bắt nhầm người!</p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-12">
                <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Tổng Điểm</p>
                  <p className="text-4xl font-black text-yellow-500">{finalScore}</p>
                </div>
                <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Thời Gian Sống</p>
                  <p className="text-4xl font-black text-blue-500">{finalTime}s</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setGameState('playing')}
                  className="bg-white text-black font-black px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" /> CHƠI LẠI
                </button>
                <button
                  onClick={() => setGameState('start')}
                  className="bg-zinc-800 text-white font-black px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-zinc-700 transition-all active:scale-95"
                >
                  <History className="w-5 h-5" /> TRANG CHỦ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default App;
