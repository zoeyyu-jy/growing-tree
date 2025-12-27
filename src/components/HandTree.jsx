import React, { useEffect, useRef, useState } from 'react';
import * as mpHands from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

const HandTree = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [openness, setOpenness] = useState(0); // 0 to 1
  const [isLoading, setIsLoading] = useState(true);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  // Initialize MediaPipe Hands
  useEffect(() => {
    // Handle different export formats in production build
    const HandsClass = mpHands.Hands || (mpHands.default && mpHands.default.Hands) || mpHands;
    
    if (typeof HandsClass !== 'function' && !window.Hands) {
      console.error('Hands constructor not found');
      return;
    }

    const hands = new (HandsClass || window.Hands)({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      setIsLoading(false);
      onResults(results);
    });
    handsRef.current = hands;

    if (videoRef.current) {
      const CameraClass = cam.Camera || (cam.default && cam.default.Camera) || cam;
      cameraRef.current = new (CameraClass || window.Camera)(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      cameraRef.current.start();
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (handsRef.current) handsRef.current.close();
    };
  }, []);

  const onResults = (results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const currentOpenness = calculateOpenness(landmarks);
      // Smooth the value slightly
      setOpenness(prev => prev * 0.8 + currentOpenness * 0.2);
    }
  };

  const calculateOpenness = (landmarks) => {
    // MediaPipe Hand Landmarks:
    // 0: Wrist
    // 4, 8, 12, 16, 20: Tips of thumb, index, middle, ring, pinky
    // 1, 5, 9, 13, 17: MCP (base of fingers)
    
    const wrist = landmarks[0];
    const tips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    const mcps = [landmarks[1], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

    // Calculate average distance from wrist to tips
    let totalTipDist = 0;
    tips.forEach(tip => {
      totalTipDist += Math.sqrt(
        Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2)
      );
    });

    // Calculate average distance from wrist to MCPs (to normalize hand size)
    let totalMcpDist = 0;
    mcps.forEach(mcp => {
      totalMcpDist += Math.sqrt(
        Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2)
      );
    });

    const avgTipDist = totalTipDist / 5;
    const avgMcpDist = totalMcpDist / 5;

    // Normalizing openness: 
    // Closed hand: tips are near MCPs (ratio ~1)
    // Open hand: tips are far from MCPs (ratio ~2-3)
    let ratio = avgTipDist / avgMcpDist;
    
    // Map ratio to 0-1 range
    // Empirically, ratio varies from ~1.2 (closed) to ~2.5 (open)
    const minRatio = 1.2;
    const maxRatio = 2.4;
    let normalized = (ratio - minRatio) / (maxRatio - minRatio);
    return Math.max(0, Math.min(1, normalized));
  };

  // Render Tree
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawTree = (x, y, len, angle, branchWidth, depth) => {
      ctx.beginPath();
      ctx.save();
      
      // Dynamic colors: greener/brighter when open
      const r = Math.floor(30 + (1 - openness) * 50);
      const g = Math.floor(150 + openness * 105);
      const b = Math.floor(200 + openness * 55);
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + depth * 0.05})`;
      ctx.lineWidth = branchWidth;
      ctx.translate(x, y);
      
      // Subtle wind sway
      const windSway = Math.sin(Date.now() / 1000 + depth) * (2 + openness * 3);
      ctx.rotate((angle + windSway) * Math.PI / 180);
      
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();

      if (depth < 9) {
        const growthFactor = 0.75 + (openness * 0.1); 
        const spreadFactor = 15 + (openness * 25);
        
        drawTree(0, -len, len * growthFactor, spreadFactor, branchWidth * 0.7, depth + 1);
        drawTree(0, -len, len * growthFactor, -spreadFactor, branchWidth * 0.7, depth + 1);
      } else {
        // Draw leaves at the tips when open
        if (openness > 0.3) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(132, 204, 22, ${(openness - 0.3) * 0.8})`; // Lime green
          ctx.arc(0, -len, 4 + openness * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Base trunk height
      const baseLen = 80 + (openness * 120);
      const startX = canvas.width / 2;
      const startY = canvas.height - 100;
      
      // Draw a subtle ground reflection or glow
      const gradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, 200 + openness * 100);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawTree(startX, startY, baseLen, 0, 12 + (openness * 8), 0);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [openness]);

  return (
    <div className="hand-tree-wrapper" style={{ width: '100%', height: '100%' }}>
      {isLoading && (
        <div className="loading-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          zIndex: 20,
          color: '#38bdf8'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(56, 189, 248, 0.3)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }} />
          <p>Initializing Camera & Hand Tracking...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '200px',
          height: '150px',
          borderRadius: '12px',
          border: '2px solid rgba(56, 189, 248, 0.5)',
          transform: 'scaleX(-1)', // Mirror video
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          opacity: isLoading ? 0 : 0.8,
          transition: 'opacity 0.5s ease'
        }}
        autoPlay
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};

export default HandTree;

