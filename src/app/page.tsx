import SmoothScroll from "./components/scroll/SmoothScroll";
import ExperienceLoader from "./components/three/ExperienceLoader";
import Hud from "./components/ui/Hud";
import Loader from "./components/ui/Loader";
import { KillOverlay } from "./components/ui/bento";
import { AboutPanel, Boarding, ContactPanel, Hero, ProjectsPanel, SecurityPanel } from "./components/ui/sections";

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE — scrollytelling
//
// A fixed WebGL scene sits behind six tall chapters. Scrolling drives
// the camera: open space → airlock → deck 01 (about) → deck 02
// (security) → deck 03 (projects) → deck 04 (contact).
// Section heights set the pacing; see .chapter--* in globals.css.
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <ExperienceLoader />
      <Loader />
      <Hud />
      <KillOverlay />
      <main className="story">
        <section id="top" data-chapter="space" className="chapter chapter--hero" aria-label="Introduction" tabIndex={-1}>
          <Hero />
        </section>
        <section id="boarding" data-chapter="boarding" className="chapter chapter--boarding" aria-hidden>
          <Boarding />
        </section>
        <section id="about" data-chapter="about" className="chapter chapter--deck" aria-label="About" tabIndex={-1}>
          <AboutPanel />
        </section>
        <section id="security" data-chapter="security" className="chapter chapter--deck" aria-label="Cybersecurity" tabIndex={-1}>
          <SecurityPanel />
        </section>
        <section id="projects" data-chapter="projects" className="chapter chapter--deck" aria-label="GitHub projects" tabIndex={-1}>
          <ProjectsPanel />
        </section>
        <section id="contact" data-chapter="contact" className="chapter chapter--last" aria-label="Contact" tabIndex={-1}>
          <ContactPanel />
        </section>
      </main>
    </>
  );
}
