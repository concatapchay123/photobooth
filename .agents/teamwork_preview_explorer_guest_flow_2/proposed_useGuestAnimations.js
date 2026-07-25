import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export default function useGuestAnimations({ guestStep }) {
  const containerRef = useRef(null);

  useGSAP(() => {
    if (!guestStep || !containerRef.current) return;
    
    // Page transition animation timeline
    const tl = gsap.timeline({
      onStart: () => {
        // Disable CSS transitions during the animation
        containerRef.current.classList.add('gsap-animating');
      },
      onComplete: () => {
        // Re-enable CSS transitions and clean up inline styles so hover states work
        containerRef.current.classList.remove('gsap-animating');
        
        // Target card/hero elements and buttons
        const targets = containerRef.current.querySelectorAll(
          '.pink-card, .pink-hero-stage, .pink-btn, .pink-outline-btn'
        );
        if (targets.length > 0) {
          gsap.set(targets, { clearProps: 'transform,opacity' });
        }
      }
    });
    
    // Animate elements entering the new step (scoped selectors)
    tl.fromTo('.pink-card, .pink-hero-stage', 
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }
    );

    // Stagger buttons (scoped selectors)
    tl.fromTo('.pink-btn, .pink-outline-btn',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)", stagger: 0.05 },
      "-=0.3"
    );

    // Specific step animations
    if (guestStep === 'capture') {
      gsap.fromTo('.pink-camera-feed-container', 
        { scale: 0.9, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.5)", clearProps: 'transform,opacity' }
      );
    } else if (guestStep === 'frame') {
      gsap.fromTo('.pink-frame-slot-item', 
        { y: 50, opacity: 0, rotationX: -15 }, 
        { y: 0, opacity: 1, rotationX: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", clearProps: 'transform,opacity' }
      );
    } else if (guestStep === 'result') {
      gsap.fromTo('.mascot-container', 
        { scale: 0, rotation: -180 }, 
        { scale: 1.15, rotation: 0, duration: 1, ease: "elastic.out(1, 0.4)", clearProps: 'transform,rotation,scale' }
      );
    }

  }, { scope: containerRef, dependencies: [guestStep], revertOnUpdate: true });

  return containerRef;
}
