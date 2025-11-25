import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'leaves' | 'air';
type GameMode = 'survival' | 'creative';

interface Block {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

interface Item {
  type: BlockType;
  count: number;
}

const blockColors: Record<BlockType, string> = {
  grass: '#7CBD4F',
  dirt: '#8B4513',
  stone: '#7F7F7F',
  wood: '#8B5A2B',
  leaves: '#228B22',
  air: 'transparent'
};

const blockNames: Record<BlockType, string> = {
  grass: 'Трава',
  dirt: 'Земля',
  stone: 'Камень',
  wood: 'Дерево',
  leaves: 'Листва',
  air: 'Воздух'
};

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const [inventory, setInventory] = useState<Item[]>([
    { type: 'grass', count: 10 },
    { type: 'dirt', count: 10 },
    { type: 'stone', count: 10 },
    { type: 'wood', count: 5 }
  ]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [health, setHealth] = useState(10);
  const [hunger, setHunger] = useState(10);
  const [showCrafting, setShowCrafting] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 6, z: 0, rotY: 0, rotX: 0 });
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    generateWorld();
  }, []);

  const generateWorld = () => {
    const newBlocks: Block[] = [];
    const worldSize = 15;
    
    for (let x = -worldSize; x < worldSize; x++) {
      for (let z = -worldSize; z < worldSize; z++) {
        const height = Math.floor(Math.sin(x * 0.2) * 1.5 + Math.cos(z * 0.2) * 1.5 + 4);
        
        newBlocks.push({ x, y: height, z, type: 'grass' });

        if (Math.random() > 0.97 && height > 2) {
          for (let ty = 0; ty < 3; ty++) {
            newBlocks.push({ x, y: height + 1 + ty, z, type: 'wood' });
          }
          for (let lx = -1; lx <= 1; lx++) {
            for (let lz = -1; lz <= 1; lz++) {
              if (lx !== 0 || lz !== 0) {
                newBlocks.push({ 
                  x: x + lx, 
                  y: height + 4, 
                  z: z + lz, 
                  type: 'leaves' 
                });
              }
            }
          }
        }
      }
    }
    
    setBlocks(newBlocks);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(0.5, '#B0D9F0');
      gradient.addColorStop(1, '#7CBD4F');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cosY = Math.cos(camera.rotY);
      const sinY = Math.sin(camera.rotY);

      const visibleBlocks = blocks.filter(block => {
        const dx = block.x - camera.x;
        const dz = block.z - camera.z;
        const rotDx = dx * cosY - dz * sinY;
        const rotDz = dx * sinY + dz * cosY;
        const dist = Math.abs(dx) + Math.abs(dz);
        return dist < 30 && rotDz > -5;
      });

      visibleBlocks.sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.x - camera.x, 2) + Math.pow(a.z - camera.z, 2));
        const distB = Math.sqrt(Math.pow(b.x - camera.x, 2) + Math.pow(b.z - camera.z, 2));
        return distB - distA;
      });

      visibleBlocks.forEach(block => {
        if (block.type === 'air') return;

        const dx = block.x - camera.x;
        const dy = block.y - camera.y;
        const dz = block.z - camera.z;

        const rotDx = dx * cosY - dz * sinY;
        const rotDz = dx * sinY + dz * cosY;

        if (rotDz < 0.5) return;

        const perspective = 600 / rotDz;
        const screenX = rotDx * perspective + canvas.width / 2;
        const screenY = -dy * perspective + canvas.height / 2;
        const size = 40 * perspective;

        if (size > 1 && screenX > -size && screenX < canvas.width + size) {
          const brightness = Math.max(0.4, 1 - rotDz / 30);
          const color = blockColors[block.type];
          
          ctx.save();
          ctx.globalAlpha = brightness;
          
          ctx.fillStyle = color;
          ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
          
          ctx.fillStyle = adjustBrightness(color, -20);
          ctx.fillRect(screenX - size / 2, screenY + size / 2 - size * 0.2, size, size * 0.2);
          
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = Math.max(1, perspective * 0.5);
          ctx.strokeRect(screenX - size / 2, screenY - size / 2, size, size);
          
          ctx.restore();
        }
      });

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(canvas.width / 2 - 12, canvas.height / 2 - 2, 24, 4);
      ctx.fillRect(canvas.width / 2 - 2, canvas.height / 2 - 12, 4, 24);
    };

    render();
  }, [blocks, camera]);

  const adjustBrightness = (color: string, amount: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      
      const speed = 0.3;
      const rotSpeed = 0.08;
      
      switch (e.key.toLowerCase()) {
        case 'w':
          setCamera(prev => ({
            ...prev,
            x: prev.x + Math.sin(prev.rotY) * speed,
            z: prev.z + Math.cos(prev.rotY) * speed
          }));
          break;
        case 's':
          setCamera(prev => ({
            ...prev,
            x: prev.x - Math.sin(prev.rotY) * speed,
            z: prev.z - Math.cos(prev.rotY) * speed
          }));
          break;
        case 'a':
          setCamera(prev => ({
            ...prev,
            x: prev.x - Math.cos(prev.rotY) * speed,
            z: prev.z + Math.sin(prev.rotY) * speed
          }));
          break;
        case 'd':
          setCamera(prev => ({
            ...prev,
            x: prev.x + Math.cos(prev.rotY) * speed,
            z: prev.z - Math.sin(prev.rotY) * speed
          }));
          break;
        case ' ':
          setCamera(prev => ({ ...prev, y: prev.y + speed }));
          break;
        case 'shift':
          setCamera(prev => ({ ...prev, y: prev.y - speed }));
          break;
        case 'arrowleft':
          setCamera(prev => ({ ...prev, rotY: prev.rotY + rotSpeed }));
          break;
        case 'arrowright':
          setCamera(prev => ({ ...prev, rotY: prev.rotY - rotSpeed }));
          break;
        case 'e':
          setShowCrafting(prev => !prev);
          break;
        case 'escape':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, camera.rotY]);

  const placeBlock = () => {
    const selectedItem = inventory[selectedSlot];
    if (!selectedItem || selectedItem.count <= 0) return;

    const newBlock: Block = {
      x: Math.round(camera.x + Math.sin(camera.rotY) * 3),
      y: Math.round(camera.y),
      z: Math.round(camera.z + Math.cos(camera.rotY) * 3),
      type: selectedItem.type
    };

    setBlocks(prev => [...prev, newBlock]);

    if (gameMode === 'survival') {
      setInventory(prev => prev.map((item, i) => 
        i === selectedSlot ? { ...item, count: item.count - 1 } : item
      ));
    }
  };

  const breakBlock = () => {
    const lookX = camera.x + Math.sin(camera.rotY) * 3;
    const lookZ = camera.z + Math.cos(camera.rotY) * 3;
    
    const nearestBlock = blocks.find(block => {
      const dist = Math.sqrt(
        Math.pow(block.x - lookX, 2) +
        Math.pow(block.y - camera.y, 2) +
        Math.pow(block.z - lookZ, 2)
      );
      return dist < 2;
    });

    if (nearestBlock) {
      setBlocks(prev => prev.filter(b => b !== nearestBlock));
      
      if (gameMode === 'survival') {
        setInventory(prev => {
          const existing = prev.find(item => item.type === nearestBlock.type);
          if (existing) {
            return prev.map(item => 
              item.type === nearestBlock.type 
                ? { ...item, count: item.count + 1 }
                : item
            );
          } else {
            return [...prev, { type: nearestBlock.type, count: 1 }];
          }
        });
      }
    }
  };

  const craftItems = () => {
    const hasWood = inventory.find(i => i.type === 'wood' && i.count >= 2);
    if (hasWood) {
      setInventory(prev => {
        const updated = prev.map(item => 
          item.type === 'wood' ? { ...item, count: item.count - 2 } : item
        );
        const stoneItem = updated.find(i => i.type === 'stone');
        if (stoneItem) {
          return updated.map(item => 
            item.type === 'stone' ? { ...item, count: item.count + 4 } : item
          );
        } else {
          return [...updated, { type: 'stone', count: 4 }];
        }
      });
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87CEEB]" style={{ fontFamily: "'Press Start 2P', cursive" }}>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="w-full h-full"
        onClick={(e) => {
          if (e.button === 0) placeBlock();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          breakBlock();
        }}
      />

      {isPaused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <Card className="p-8 bg-stone-800 border-4 border-stone-600">
            <h1 className="text-3xl text-white mb-6 text-center">ПАУЗА</h1>
            <div className="space-y-4">
              <Button 
                onClick={() => setIsPaused(false)}
                className="w-full bg-[#7CBD4F] text-white hover:bg-[#6BAD3F] text-sm py-6"
              >
                Продолжить игру
              </Button>
              <Button 
                onClick={() => {
                  setIsPaused(false);
                  setShowCrafting(true);
                }}
                className="w-full bg-stone-600 text-white hover:bg-stone-500 text-sm py-6"
              >
                Крафтинг (E)
              </Button>
              <Button 
                onClick={() => {
                  setGameMode(gameMode === 'survival' ? 'creative' : 'survival');
                  setIsPaused(false);
                }}
                className="w-full bg-purple-600 text-white hover:bg-purple-500 text-sm py-6"
              >
                Режим: {gameMode === 'survival' ? 'Выживание' : 'Креатив'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showCrafting && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40" onClick={() => setShowCrafting(false)}>
          <Card className="p-6 bg-stone-800 border-4 border-stone-600 max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-white">КРАФТИНГ</h2>
              <Button 
                onClick={() => setShowCrafting(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-stone-700"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="bg-stone-700 p-3 rounded border-2 border-stone-600">
                <div className="text-white mb-2">2x Дерево → 4x Камень</div>
                <Button 
                  onClick={craftItems}
                  disabled={!inventory.find(i => i.type === 'wood' && i.count >= 2)}
                  className="w-full bg-[#7CBD4F] text-white hover:bg-[#6BAD3F] disabled:opacity-50 text-xs py-3"
                >
                  Скрафтить
                </Button>
              </div>

              <div className="bg-stone-700 p-3 rounded border-2 border-stone-600 opacity-50">
                <div className="text-gray-400 mb-2">3x Камень → Инструмент</div>
                <Button 
                  disabled
                  className="w-full bg-gray-600 text-white text-xs py-3"
                >
                  Скоро...
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="absolute top-4 left-4 space-y-2 z-30">
        <div className="flex gap-2">
          {gameMode === 'survival' && (
            <>
              <div className="flex items-center gap-1 bg-black/50 px-3 py-2 rounded">
                <Icon name="Heart" size={16} className="text-red-500" />
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 ${i < health ? 'bg-red-500' : 'bg-gray-700'} border border-black`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 bg-black/50 px-3 py-2 rounded">
                <Icon name="Drumstick" size={16} className="text-orange-500" />
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 ${i < hunger ? 'bg-orange-500' : 'bg-gray-700'} border border-black`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <Badge className="bg-purple-600 text-white text-xs px-3 py-1">
          {gameMode === 'survival' ? 'ВЫЖИВАНИЕ' : 'КРЕАТИВ'}
        </Badge>
      </div>

      <div className="absolute top-4 right-4 bg-black/70 p-4 rounded text-white text-xs space-y-1 z-30">
        <div className="font-bold mb-2">УПРАВЛЕНИЕ</div>
        <div>WASD - движение</div>
        <div>← → - поворот</div>
        <div>Пробел/Shift - вверх/вниз</div>
        <div>ЛКМ - поставить блок</div>
        <div>ПКМ - сломать блок</div>
        <div>E - крафтинг</div>
        <div>ESC - пауза</div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
        {inventory.slice(0, 9).map((item, i) => (
          <div
            key={i}
            onClick={() => setSelectedSlot(i)}
            className={`w-16 h-16 bg-black/70 border-4 cursor-pointer transition-all hover:scale-105 ${
              selectedSlot === i ? 'border-white' : 'border-gray-600'
            } flex flex-col items-center justify-center`}
          >
            <div 
              className="w-8 h-8 mb-1"
              style={{ backgroundColor: blockColors[item.type] }}
            />
            <div className="text-white text-xs">{item.count}</div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white text-xs bg-black/70 px-3 py-1 rounded z-30">
        {blockNames[inventory[selectedSlot]?.type] || 'Пусто'}
      </div>
    </div>
  );
}