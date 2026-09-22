'use client';

import { useEffect, useRef, useState } from 'react';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const getScene = (progress: number) => Math.min(4, Math.floor(progress * 5));

export function ScrollVideoExperience() {
  const containerRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const isNearViewportRef = useRef(true);
  const sceneRef = useRef(0);
  const visibleSceneRef = useRef(0);
  const [scene, setScene] = useState(0);
  const [visibleScene, setVisibleScene] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<'visible' | 'out' | 'in'>('visible');

  useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    const update = () => {
      frameRef.current = null;
      if (!isNearViewportRef.current) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom < -viewportHeight || rect.top > viewportHeight) return;

      const scrollableDistance = container.offsetHeight - viewportHeight;
      const progress = scrollableDistance > 0 ? clamp(-rect.top / scrollableDistance) : 0;
      const nextScene = getScene(progress);
      const platformProgress = clamp((progress - 0.16) / 0.2);
      const methodProgress = clamp((progress - 0.42) / 0.2);
      const membershipProgress = clamp((progress - 0.67) / 0.2);
      const exitProgress = clamp((progress - 0.9) / 0.1);
      const brandOpacity = 1 - clamp((progress - 0.18) / 0.22);
      const platformOpacity = Math.min(platformProgress, 1 - methodProgress);
      const methodOpacity = Math.min(methodProgress, 1 - membershipProgress);

      stage.style.setProperty('--scroll-progress', progress.toFixed(4));
      stage.style.setProperty('--s1', platformProgress.toFixed(4));
      stage.style.setProperty('--s2', methodProgress.toFixed(4));
      stage.style.setProperty('--s3', membershipProgress.toFixed(4));
      stage.style.setProperty('--s4', exitProgress.toFixed(4));
      stage.style.setProperty('--brand-shift', `${(platformProgress * 90).toFixed(1)}px`);
      stage.style.setProperty('--platform-shift', `${((1 - platformProgress) * 56).toFixed(1)}px`);
      stage.style.setProperty('--panel-shift', `${((1 - platformProgress) * 35).toFixed(1)}px`);
      stage.style.setProperty('--exit-shift', `${((1 - exitProgress) * 12).toFixed(1)}px`);
      stage.style.setProperty('--path-offset', `${(1500 - progress * 1500).toFixed(1)}`);
      stage.style.setProperty('--brand-opacity', brandOpacity.toFixed(4));
      stage.style.setProperty('--platform-opacity', platformOpacity.toFixed(4));
      stage.style.setProperty('--method-opacity', methodOpacity.toFixed(4));
      stage.style.setProperty('--active-scene', String(nextScene));
      if (nextScene !== sceneRef.current) {
        sceneRef.current = nextScene;
        setScene(nextScene);
      }
    };

    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      isNearViewportRef.current = Boolean(entry?.isIntersecting);
      if (isNearViewportRef.current) requestUpdate();
    }, { rootMargin: '120% 0px' });

    observer.observe(container);
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const presentationScene = Math.min(scene, 3);
    if (presentationScene === visibleSceneRef.current) return;

    let enterFrame: number | null = null;
    const fadeOutTimer = window.setTimeout(() => setTransitionPhase('out'), 0);
    const sceneSwapTimer = window.setTimeout(() => {
      visibleSceneRef.current = presentationScene;
      setVisibleScene(presentationScene);
      setTransitionPhase('in');
      enterFrame = window.requestAnimationFrame(() => setTransitionPhase('visible'));
    }, 420);

    return () => {
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(sceneSwapTimer);
      if (enterFrame !== null) window.cancelAnimationFrame(enterFrame);
    };
  }, [scene]);

  return (
    <section ref={containerRef} id="overview" className="relative h-[400vh] overflow-clip bg-navy motion-reduce:h-auto" aria-label="Banking BA Knowledge Hub introduction">
      <div ref={stageRef} className="cinematic-story sticky top-[72px] h-[calc(100vh-72px)] h-[calc(100dvh-72px)] min-h-[540px] overflow-hidden bg-navy motion-reduce:static motion-reduce:h-[calc(100svh-72px)]" data-scene={scene} data-visible-scene={visibleScene} data-transition-phase={transitionPhase}>
        <div className="cinematic-glow" aria-hidden="true" />
        <div className="cinematic-grid" aria-hidden="true" />
        <svg className="cinematic-path" viewBox="0 0 1200 680" preserveAspectRatio="none" aria-hidden="true"><path d="M-40 108 C155 36 294 146 458 78 S744 42 926 116 S1104 86 1240 42" /><path d="M-40 606 C154 540 304 638 478 572 S768 620 944 552 S1110 584 1240 624" /></svg>

        <div className="cinematic-brand cinematic-layer"><p className="cinematic-kicker">WELCOME TO</p><h1 className="cinematic-title">BANKING KN<span>O</span>WLEDGE HUB</h1><p className="cinematic-scroll-cue">SCROLL TO EXPLORE <i /></p></div>

        <div className="cinematic-platform cinematic-layer" aria-hidden={scene < 1}><div className="platform-bar"><span>Knowledge workspace</span><b>MEMBERS ONLY</b></div><div className="platform-panels"><article><small>01</small><strong>Banking journeys</strong><p>Products, processes and controls.</p></article><article><small>02</small><strong>BA practice</strong><p>Discovery to delivery methods.</p></article><article><small>03</small><strong>Practice cases</strong><p>Reusable learning context.</p></article></div></div>

        <div className="cinematic-method cinematic-layer" aria-hidden={scene < 2}><div className="method-line" aria-hidden="true" /><article><small>01</small><strong>Banking<br />Knowledge</strong></article><article><small>02</small><strong>Business<br />Analysis</strong></article><article><small>03</small><strong>Delivery<br />Methodology</strong></article></div>

        <div className="cinematic-membership cinematic-layer" aria-hidden={scene < 3}><p className="cinematic-kicker">MEMBER VALUE</p><h2>Knowledge with <span>direction.</span></h2><div><article>Structured knowledge</article><article>Practical banking cases</article><article>Reusable BA assets</article></div></div>
        <p className="cinematic-exit">Continue to Platform Overview <span>↓</span></p>
      </div>
    </section>
  );
}
