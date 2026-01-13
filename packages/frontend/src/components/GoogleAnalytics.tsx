import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface GoogleAnalyticsProps {
  measurementId: string;
}

// Google Ads Conversion ID
const GOOGLE_ADS_ID = 'AW-17732520157';

// Declare gtag global function
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

/**
 * Dispara evento de conversão do Google Ads para inscrição/cadastro
 */
export const trackSignupConversion = () => {
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      'send_to': `${GOOGLE_ADS_ID}/QV2ZCMv7tOIbEN2Rw4dC`,
      'value': 1.0,
      'currency': 'EUR'
    });
    console.log('📊 Google Ads conversion tracked: Signup');
  } else {
    console.warn('⚠️ gtag not available for conversion tracking');
  }
};

const GoogleAnalytics = ({ measurementId }: GoogleAnalyticsProps) => {
  const location = useLocation();

  useEffect(() => {
    // Load Google Analytics script
    if (!window.gtag) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId}', {
          page_path: window.location.pathname,
          send_page_view: true
        });
        gtag('config', '${GOOGLE_ADS_ID}');
      `;
      document.head.appendChild(script2);
    }
  }, [measurementId]);

  // Track page views on route change
  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', measurementId, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, measurementId]);

  return null;
};

export default GoogleAnalytics;
