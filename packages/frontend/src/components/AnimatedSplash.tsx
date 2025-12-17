import { useState, useEffect } from 'react';

interface AnimatedSplashProps {
  onFinish: () => void;
}

const AnimatedSplash = ({ onFinish }: AnimatedSplashProps) => {
  const [text, setText] = useState('');
  const [showSparkle, setShowSparkle] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const fullText = 'Guru do Dindin';

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setShowSparkle(true);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onFinish, 500);
          }, 800);
        }, 300);
      }
    }, 250);

    return () => clearInterval(typingInterval);
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1d4ed8 100%)',
      zIndex: 9999,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.5s ease-out',
    }}>
      {/* Logo - centralizado exatamente no meio da tela */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '150px',
        height: '150px',
      }}>
        <img
          src="./logobranco.png"
          alt="Guru do Dindin"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'rotateGuru 4s ease-in-out forwards',
            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))',
          }}
        />
        {showSparkle && (
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '-20px',
            width: '190px',
            height: '190px',
            border: '3px solid transparent',
            borderTopColor: '#ffffff',
            borderRightColor: '#ffffff',
            borderRadius: '50%',
            animation: 'sparkleRing 1s ease-out forwards',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Texto - posicionado abaixo do guru */}
      <div style={{
        position: 'absolute',
        top: 'calc(50% + 100px)',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          letterSpacing: '2px',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          {text}
          <span style={{
            animation: 'blink 0.7s infinite',
            color: '#ffffff',
            fontWeight: 300,
            visibility: showSparkle ? 'hidden' : 'visible',
          }}>|</span>
        </h1>
        {showSparkle && (
          <div style={{
            marginTop: '15px',
            animation: 'sparkleAppear 0.5s ease-out forwards',
          }}>
            <span style={{
              fontSize: '1.5rem',
              animation: 'sparkleFloat 0.8s ease-in-out infinite',
              filter: 'grayscale(100%) brightness(2)',
            }}>✨</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes rotateGuru {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(0deg); }
          37.5% { transform: rotate(180deg); }
          62.5% { transform: rotate(180deg); }
          75% { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sparkleRing {
          0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: rotate(360deg) scale(1.1); opacity: 0; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes sparkleAppear {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sparkleFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedSplash;
