import React, { useEffect, useRef, useState } from 'react';
import { Crown, ShieldAlert, User, Music, Swords, Skull, Trophy, Play, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type NPCType = 'monk' | 'soldier' | 'musician' | 'peasant';
interface NPC {
  id: number;
  type: NPCType;
  isAssassin: boolean;
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1; // 1: left to right, -1: right to left
  state: 'walking' | 'attacking' | 'caught' | 'leaving';
  attackTimer: number;
  color: string;
}

interface GameProps {
  onGameOver: (score: number, time: number) => void;
  difficulty: number;
}

const NPC_COLORS = {
  monk: '#fbbf24', // amber
  soldier: '#ef4444', // red
  musician: '#8b5cf6', // violet
  peasant: '#10b981', // emerald
};

const Game: React.FC<GameProps> = ({ onGameOver, difficulty }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  
  const gameState = useRef({
    npcs: [] as NPC[],
    lastSpawn: 0,
    score: 0,
    gameOver: false,
    nextId: 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const spawnNPC = () => {
      const side = Math.random() > 0.5 ? 1 : -1;
      const type: NPCType = (['monk', 'soldier', 'musician', 'peasant'] as NPCType[])[Math.floor(Math.random() * 4)];
      const isAssassin = Math.random() < 0.2 + (difficulty * 0.05);
      
      const npc: NPC = {
        id: gameState.current.nextId++,
        type,
        isAssassin,
        x: side === 1 ? -50 : canvas.width + 50,
        y: canvas.height - 100,
        speed: (1.5 + Math.random() * 2) * (1 + difficulty * 0.1),
        direction: side,
        state: 'walking',
        attackTimer: 0,
        color: NPC_COLORS[type],
      };
      
      gameState.current.npcs.push(npc);
    };

    const update = () => {
      if (gameState.current.gameOver || isPaused) return;

      const now = Date.now();
      const spawnRate = Math.max(500, 2000 - difficulty * 200);
      
      if (now - gameState.current.lastSpawn > spawnRate) {
        spawnNPC();
        gameState.current.lastSpawn = now;
      }

      gameState.current.npcs.forEach((npc, index) => {
        if (npc.state === 'walking') {
          npc.x += npc.speed * npc.direction;
          
          // Check if near king (center)
          const distToCenter = Math.abs(npc.x - canvas.width / 2);
          if (distToCenter < 80) {
            if (npc.isAssassin) {
              npc.state = 'attacking';
              npc.attackTimer = 60 - (difficulty * 5); // Frames to react
            } else {
              npc.state = 'leaving';
            }
          }
        } else if (npc.state === 'attacking') {
          npc.attackTimer--;
          if (npc.attackTimer <= 0) {
            // Assassin attacks! Game Over
            gameState.current.gameOver = true;
            onGameOver(gameState.current.score, Math.floor((Date.now() - startTime) / 1000));
          }
        } else if (npc.state === 'leaving' || npc.state === 'caught') {
          npc.x += npc.speed * npc.direction;
          if (npc.x < -100 || npc.x > canvas.width + 100) {
            gameState.current.npcs.splice(index, 1);
          }
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Floor
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

      // Draw King (Throne)
      const centerX = canvas.width / 2;
      const centerY = canvas.height - 100;
      
      ctx.fillStyle = '#fde047'; // Gold throne
      ctx.fillRect(centerX - 30, centerY, 60, 60);
      ctx.fillStyle = '#991b1b'; // Red cushion
      ctx.fillRect(centerX - 20, centerY + 10, 40, 10);
      
      // King Figure
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 10, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15'; // Crown
      ctx.fillRect(centerX - 10, centerY - 35, 20, 10);

      // Draw NPCs
      gameState.current.npcs.forEach(npc => {
        ctx.save();
        ctx.translate(npc.x, npc.y);
        
        // Body
        ctx.fillStyle = npc.color;
        if (npc.state === 'caught') ctx.globalAlpha = 0.5;
        
        ctx.beginPath();
        ctx.roundRect(-15, 0, 30, 40, 5);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();

        // Assassin Indicator
        if (npc.state === 'attacking') {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 30px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('!', 0, -30);
          
          // Red glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'red';
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.strokeRect(-18, -2, 36, 44);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(() => {
        update();
        draw();
      });
    };

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [difficulty, isPaused]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.current.gameOver || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;
    gameState.current.npcs.forEach(npc => {
      // Simple box collision
      if (
        clickX > npc.x - 30 && clickX < npc.x + 30 &&
        clickY > npc.y - 40 && clickY < npc.y + 60
      ) {
        if (npc.state === 'attacking') {
          npc.state = 'caught';
          npc.speed *= 2; // Run away caught
          gameState.current.score += 100;
          setScore(gameState.current.score);
          hit = true;
          
          // Play success sound (simulated)
          console.log("Caught assassin!");
        } else if (npc.state === 'walking') {
          // Wrongful arrest! Game Over
          gameState.current.gameOver = true;
          onGameOver(gameState.current.score, Math.floor((Date.now() - startTime) / 1000));
        }
      }
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
      <div className="absolute top-4 left-4 flex gap-4 text-white z-10">
        <div className="bg-black/50 p-2 rounded-lg flex items-center gap-2 border border-white/10">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-mono text-xl">{score}</span>
        </div>
        <div className="bg-black/50 p-2 rounded-lg flex items-center gap-2 border border-white/10">
          <Skull className="w-5 h-5 text-red-500" />
          <span className="font-mono text-xl">Difficulty: {difficulty}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        onClick={handleCanvasClick}
        className="bg-gray-800 rounded-xl shadow-2xl cursor-crosshair border-4 border-gray-700"
        id="game-canvas"
      />
      
      <div className="mt-6 text-gray-400 text-sm flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        <span>Click vào kẻ ám sát khi chúng hiện dấu "!" để bắt giữ! Đừng bắt nhầm dân thường.</span>
      </div>
    </div>
  );
};

export default Game;
