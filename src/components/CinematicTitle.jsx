import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HOLD_MS = 2500;

export default function CinematicTitle({ kanji, subtitle, color, onDone, isActive = true }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let t1, t2;
    if (!isActive) {
      setIsVisible(false);
      t2 = setTimeout(() => onDone?.(), 500);
    } else {
      setIsVisible(true);
      t1 = setTimeout(() => setIsVisible(false), HOLD_MS);
      t2 = setTimeout(() => onDone?.(), HOLD_MS + 500);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isActive, onDone]);

  const chars = kanji.split('');
  
  // Clean, surgical pacing
  const staggerTime = 0.03;
  const revealDuration = chars.length * staggerTime;

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: staggerTime }
    },
    exit: {
      opacity: 0,
      scale: 1.05,
      filter: "blur(10px)",
      transition: { duration: 0.4, ease: "easeIn" }
    }
  };

  const charVariants = {
    hidden: { 
      opacity: 0, 
      scale: 1.4,
      x: -15,
      filter: "blur(8px)", // Clean blur, no rotation
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { 
        type: "spring", 
        damping: 14,    // High damping for a solid, clean lock
        stiffness: 300, 
        mass: 0.8
      }
    }
  };

  const flashVariants = {
    hidden: { filter: "brightness(1) drop-shadow(0px 0px 0px transparent)", scale: 1 },
    visible: {
      filter: [
        "brightness(1) drop-shadow(0px 0px 0px transparent)", 
        `brightness(2.5) drop-shadow(0px 0px 60px ${color})`, 
        `brightness(1) drop-shadow(0px 0px 15px ${color})`
      ],
      // Clean micro-zoom instead of massive crunch
      scale: [1, 1.04, 1], 
      transition: {
        delay: revealDuration + 0.05, 
        duration: 0.35,
        times: [0, 0.15, 1],
        ease: "easeOut"
      }
    }
  };

  const shakeVariants = {
    hidden: { x: 0, y: 0 },
    visible: {
      // Subtle, high-frequency pressure vibration
      x: [0, -3, 3, -2, 2, -1, 1, 0],
      y: [0, 2, -2, 1, -1, 0, 0, 0],
      transition: {
        delay: revealDuration + 0.05,
        duration: 0.25,
        ease: "linear"
      }
    }
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: 10, letterSpacing: "0.2em" },
    visible: { 
      opacity: 1, 
      y: 0, 
      letterSpacing: "0.8em",
      transition: {
        delay: revealDuration + 0.2,
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const slashVariants = {
    hidden: { x: "-50vw", opacity: 0 },
    visible: {
      x: ["-50vw", "50vw"],
      opacity: [0, 1, 1, 0],
      transition: {
        duration: revealDuration + 0.15,
        ease: "easeOut"
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ position: 'absolute', bottom: '80px', left: '0', right: '0', zIndex: 100, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <motion.div variants={shakeVariants}>
            <motion.div 
              variants={flashVariants}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              
              <motion.div
                variants={slashVariants}
                style={{
                  position: 'absolute',
                  top: '-15%',
                  bottom: '-15%',
                  width: '6px', // Sharp, straight beam of light
                  background: '#fff',
                  boxShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 80px ${color}`,
                  transformOrigin: 'center',
                  skewX: '0deg', // Perfectly straight
                  mixBlendMode: 'screen',
                  zIndex: 2,
                }}
              />

              <motion.div variants={containerVariants} className="ct-main-text" style={{ display: 'flex', fontWeight: 900, fontFamily: '"Noto Sans JP", sans-serif', color: '#ffffff' }}>
                {chars.map((char, index) => {
                  const isQuote = char === '「';
                  return (
                    <motion.span 
                      key={index} 
                      variants={charVariants}
                      style={{ 
                        display: 'inline-block',
                        marginLeft: isQuote ? '0.3em' : '0px'
                      }}
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            variants={subtitleVariants}
            className="ct-subtitle-text"
            style={{ fontWeight: 'bold', fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', marginTop: '12px' }}
          >
            {subtitle}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
