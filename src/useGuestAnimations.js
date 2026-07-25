import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export default function useGuestAnimations({ guestStep }) {
  const containerRef = useRef(null);

  useGSAP(() => {
    if (!guestStep) return;
    
    // Page transition animation
    const tl = gsap.timeline({
      onStart: () => {
        if (containerRef.current) {
          containerRef.current.classList.add('gsap-animating');
        }
      },
      onComplete: () => {
        if (containerRef.current) {
          containerRef.current.classList.remove('gsap-animating');
        }
        gsap.set('.pink-card, .pink-hero-stage, .pink-btn, .pink-outline-btn', { 
          clearProps: 'transform,opacity' 
        });
      }
    });
    
    // Animate elements entering the new step
    tl.fromTo('.pink-card, .pink-hero-stage', 
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }
    );

    // Stagger buttons
    tl.fromTo('.pink-btn, .pink-outline-btn',
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.05 },
      "-=0.3"
    );

    // Specific step animations
    if (guestStep === 'capture') {
      gsap.fromTo('.pink-camera', 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.5)", clearProps: 'transform,opacity' }
      );
    } else if (guestStep === 'frame') {
      gsap.fromTo('.pink-frame-choice', 
        { y: 50, opacity: 0, rotationX: -15 }, 
        { y: 0, opacity: 1, rotationX: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", clearProps: 'transform,opacity' }
      );
    } else if (guestStep === 'result') {
      gsap.fromTo('.mascot-container', 
        { scale: 0, rotation: -180 }, 
        { scale: 1.15, rotation: 0, duration: 1, ease: "elastic.out(1, 0.4)" }
      );
    }

  }, { dependencies: [guestStep], scope: containerRef, revertOnUpdate: true });

  return containerRef;
}
