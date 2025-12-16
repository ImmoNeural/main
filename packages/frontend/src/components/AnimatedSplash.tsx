import { useState, useEffect } from 'react';
import './AnimatedSplash.css';

interface AnimatedSplashProps {
  onFinish: () => void;
}

const AnimatedSplash = ({ onFinish }: AnimatedSplashProps) => {
  const [text, setText] = useState('');
  const [showSparkle, setShowSparkle] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [startTyping, setStartTyping] = useState(false);

  const fullText = 'Guru do Dindin';

  useEffect(() => {
    // Wait for logo rotation (1.5s) + pause (1s) before starting text
    const startDelay = setTimeout(() => {
      setStartTyping(true);
    }, 2500);

    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (!startTyping) return;

    // Typing effect - letter by letter
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // Show sparkle effect after text is complete
        setShowSparkle(true);

        // Fade out and finish after sparkle
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onFinish, 500);
        }, 800);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, [onFinish, startTyping]);

  return (
    <div className={`animated-splash ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        {/* Logo with rotation animation */}
        <div className="logo-container">
          <img
            src="./logobranco.png"
            alt="Guru do Dindin"
            className="splash-logo"
          />
          {showSparkle && <div className="sparkle-ring" />}
        </div>

        {/* Animated text */}
        <div className="splash-text-container">
          <h1 className="splash-text">
            {text}
            {startTyping && !showSparkle && <span className="cursor">|</span>}
          </h1>
          {showSparkle && (
            <div className="sparkle-effect">
              <span className="sparkle">✨</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedSplash;
