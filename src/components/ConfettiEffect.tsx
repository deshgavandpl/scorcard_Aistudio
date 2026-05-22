import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ConfettiEffectProps {
  active: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  rotation: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'triangle';
  duration: number;
  delay: number;
}

const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export default function ConfettiEffect({ active }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: 60 }).map((_, i) => {
      // Choose random launch angle and distance
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 150;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * (distance * 0.7) + 120; // Gravity offset pulls it down

      const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 5 + Math.random() * 8; // Random dimension

      return {
        id: i,
        x: 0,
        y: 0,
        tx,
        ty,
        rotation: Math.random() * 360 + 360, // Rotates multiple times
        color,
        size,
        shape,
        duration: 1.2 + Math.random() * 1.5,
        delay: Math.random() * 0.15,
      };
    });

    setParticles(newParticles);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-[280]">
      {particles.map((p) => {
        const renderShape = () => {
          if (p.shape === 'circle') {
            return (
              <div
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: '50%',
                }}
              />
            );
          } else if (p.shape === 'triangle') {
            return (
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: `${p.size / 2}px solid transparent`,
                  borderRight: `${p.size / 2}px solid transparent`,
                  borderBottom: `${p.size}px solid ${p.color}`,
                }}
              />
            );
          } else {
            return (
              <div
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
              />
            );
          }
        };

        return (
          <motion.div
            key={p.id}
            initial={{ 
              x: '50%', 
              y: '50%', 
              scale: 0, 
              opacity: 1, 
              rotate: 0 
            }}
            animate={{
              x: `calc(50% + ${p.tx}px)`,
              y: `calc(50% + ${p.ty}px)`,
              scale: [0, 1.2, 0.8, 0],
              opacity: [1, 1, 0.7, 0],
              rotate: p.rotation,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.1, 0.8, 0.3, 1],
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            {renderShape()}
          </motion.div>
        );
      })}
    </div>
  );
}
