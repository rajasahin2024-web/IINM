import Image from "next/image";
import Link from "next/link";
import React from "react";

type EditorType = "story" | "founders" | "gallery" | "timeline" | "hero" | "who" | "purpose" | "alumni";

interface AboutSettings {
  mission_statement?: string;
  vision_statement?: string;
  story_title?: string;
  story_text?: string;
  stats_students?: string;
  director_name?: string;
  director_title?: string;
  director_message?: string;
  director_image_url?: string;
  hero_eyebrow?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_note?: string;
  hero_image_1?: string;
  hero_image_2?: string;
  hero_image_3?: string;
  hero_image_4?: string;
  hero_image_5?: string;
  hero_image_6?: string;
  difference_eyebrow?: string;
  difference_title?: string;
  difference_video_url?: string;
  difference_at_iinm_heading?: string;
  difference_traditional_heading?: string;
  difference_rows_json?: string;
  alumni_eyebrow?: string;
  alumni_title?: string;
  alumni_description?: string;
}

interface Founder {
  name?: string;
  role?: string;
  bio?: string;
  quote?: string;
  image_url?: string;
  video_url?: string;
  linkedin_url?: string;
  business_logo_url?: string;
}

interface ExtendedAbout {
  founder1?: Founder;
  founder2?: Founder;
  gallery?: Array<{ id: string; image_url: string; caption?: string }>;
  timeline?: Array<{ id: string; year: string; title: string; description: string; icon_name?: string }>;
  alumni_logos?: Array<{ id: string; image_url: string }>;
}

interface CoreValue {
  id: number;
  title: string;
  description?: string;
}

interface TeamMember {
  id: number;
  name: string;
  designation?: string;
  image_url?: string;
}

interface AboutInstitutionalLayoutProps {
  settings: AboutSettings;
  extended: ExtendedAbout;
  values: CoreValue[];
  team: TeamMember[];
  isAdmin: boolean;
  videoPlay: Record<string, boolean>;
  getAssetUrl: (url: string) => string;
  onEdit: (type: EditorType) => void;
  onPlayFounder: (key: string) => void;
}

function AlumniLogoStrip({ logos, getAssetUrl, reverse = false }: { logos: Array<{ id: string; image_url: string }>; getAssetUrl: (url: string) => string; reverse?: boolean }) {
  const items = logos.length ? logos : [{ id: "placeholder", image_url: "" }];
  const trackClass = reverse ? "about-institutional-logo-track about-institutional-logo-track-reverse" : "about-institutional-logo-track";
  return (
    <div className="about-institutional-logo-row">
      <div className={trackClass}>
        {items.map((logo) => (
          <div key={logo.id} className="about-institutional-logo-cell">
            <Image src={resolveImage(getAssetUrl, logo.image_url)} alt="Partner logo" width={120} height={44} unoptimized />
          </div>
        ))}
        {items.map((logo) => (
          <div key={`${logo.id}-dup`} className="about-institutional-logo-cell" aria-hidden="true">
            <Image src={resolveImage(getAssetUrl, logo.image_url)} alt="Partner logo" width={120} height={44} unoptimized />
          </div>
        ))}
      </div>
    </div>
  );
}

function resolveImage(getAssetUrl: (url: string) => string, url: string | undefined): string {
  const resolved = getAssetUrl(url || "");
  return resolved || "/placeholder.png";
}

function toYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return trimmed;
}

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function PlayButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="about-institutional-play" type="button" onClick={onClick} aria-label="Play founder video">
      <span aria-hidden="true">▶</span>
    </button>
  );
}

function FounderCard({
  founder,
  founderKey,
  videoPlay,
  getAssetUrl,
  onPlayFounder,
}: {
  founder: Founder;
  founderKey: string;
  videoPlay: Record<string, boolean>;
  getAssetUrl: (url: string) => string;
  onPlayFounder: (key: string) => void;
}) {
  const image = resolveImage(getAssetUrl, founder.image_url);
  return (
    <article className="about-institutional-founder-card">
      <div className="about-institutional-founder-photo">
        {founder.video_url && videoPlay[founderKey] ? (
          <iframe
            src={`https://www.youtube.com/embed/${founder.video_url}?autoplay=1&controls=1`}
            title={founder.name || "Founder video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <>
            <Image src={image} alt={founder.name || "IINM founder"} width={800} height={800} unoptimized />
            {founder.video_url && <PlayButton onClick={() => onPlayFounder(founderKey)} />}
          </>
        )}
      </div>
      <div className="about-institutional-founder-copy">
        <p className="about-institutional-founder-role">{founder.role || ""}</p>
        <h3>{founder.name || ""}</h3>
        <p>{founder.bio || ""}</p>
        {founder.quote && <blockquote>“{founder.quote}”</blockquote>}
        {founder.linkedin_url && (
          <a
            href={founder.linkedin_url.startsWith("http") ? founder.linkedin_url : `https://${founder.linkedin_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="about-institutional-founder-linkedin"
          >
            LinkedIn Profile <ArrowIcon />
          </a>
        )}
        {founder.business_logo_url && (
          <div className="about-institutional-founder-logo-wrap">
            <span>Startup / Business</span>
            <Image
              src={resolveImage(getAssetUrl, founder.business_logo_url)}
              alt={`${founder.name || "Founder"} business logo`}
              width={120}
              height={44}
              unoptimized
              className="about-institutional-founder-logo"
            />
          </div>
        )}
      </div>
    </article>
  );
}

export default function AboutInstitutionalLayout({
  settings,
  extended,
  values,
  team,
  isAdmin,
  videoPlay,
  getAssetUrl,
  onEdit,
  onPlayFounder,
}: AboutInstitutionalLayoutProps) {
  const gallery = extended.gallery || [];
  const timeline = extended.timeline || [];
  const founders = [extended.founder1, extended.founder2].filter(Boolean) as Founder[];
  const heroImages = [
    ...gallery.map((item) => item.image_url),
    ...team.map((member) => member.image_url || ""),
  ].filter(Boolean);
  const pathways = values.slice(0, 3).map((value) => ({ title: value.title, description: value.description || "" }));
  const mission = settings.mission_statement || "";
  const vision = settings.vision_statement || "";
  const story = settings.story_text || "";
  const directorImage = resolveImage(getAssetUrl, settings.director_image_url || undefined);
  const heroImageSlots = [
    settings.hero_image_1,
    settings.hero_image_2,
    settings.hero_image_3,
    settings.hero_image_4,
    settings.hero_image_5,
    settings.hero_image_6,
  ];
  const differenceRows = (() => {
    try {
      const rows = JSON.parse(settings.difference_rows_json || "[]") as Array<{ at_iinm?: string; traditional?: string }>;
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  })();
  const differenceVideoUrl = settings.difference_video_url || "";

  return (
    <main className="about-institutional-page">
      <section className="about-institutional-hero">
        <div className="about-institutional-container">
          <p className="about-institutional-eyebrow">{settings.hero_eyebrow || ""}</p>
          <h1>{settings.hero_title || ""}</h1>
          <p className="about-institutional-hero-copy">{settings.hero_subtitle || ""}</p>
          <div className="about-institutional-collage" aria-label="IINM community gallery">
            {Array.from({ length: 6 }, (_, index) => {
              const source = heroImageSlots[index] || heroImages[index] || "";
              return <Image key={`${source || "placeholder"}-${index}`} className={`about-institutional-collage-image about-institutional-collage-image-${index + 1}`} src={resolveImage(getAssetUrl, source)} alt="IINM learning community" width={800} height={600} unoptimized priority={index < 2} />;
            })}
          </div>
          <div className="about-institutional-hero-note"><span />{settings.hero_note || ""}</div>
          {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("hero")}>Edit Hero Section</button>}
        </div>
      </section>

      <section className="about-institutional-who">
        <div className="about-institutional-container">
          <div className="about-institutional-who-layout">
            <div className="about-institutional-who-copy">
              <p className="about-institutional-eyebrow">WHO WE ARE</p>
              <h2>{settings.story_title || ""}</h2>
              <p className="about-institutional-who-description">{story}</p>
            </div>
            <div className="about-institutional-who-gallery">
              {gallery.slice(0, 3).map((item) => (
                <article className="about-institutional-who-gallery-card" key={item.id}>
                  <Image src={resolveImage(getAssetUrl, item.image_url)} alt={item.caption || "About IINM"} width={420} height={280} unoptimized />
                  <div className="about-institutional-who-gallery-overlay">
                    <strong>{item.caption || ""}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
          {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("who")}>Edit Who We Are</button>}
        </div>
      </section>

      <section className="about-institutional-dark">
        <div className="about-institutional-container about-institutional-dark-grid">
          <div className="about-institutional-dark-copy">
            <p className="about-institutional-eyebrow">OUR PURPOSE</p>
            <h2>Why we exist</h2>
            <div className="about-institutional-purpose-block">
              <span>01</span>
              <div><h3>Our Mission</h3><p>{mission}</p></div>
            </div>
            <div className="about-institutional-purpose-block">
              <span>02</span>
              <div><h3>Our Vision</h3><p>{vision}</p></div>
            </div>
            {isAdmin && <button className="about-institutional-edit about-institutional-edit-dark" type="button" onClick={() => onEdit("purpose")}>Edit Why We Exist</button>}
          </div>
          <div className="about-institutional-dark-image">
            <Image src={resolveImage(getAssetUrl, heroImageSlots[2] || heroImages[2] || undefined)} alt="IINM learners collaborating" width={800} height={900} unoptimized />
            <div className="about-institutional-dark-image-caption">Ideas become impact when people build together.</div>
          </div>
        </div>
      </section>

      <section className="about-institutional-pathways">
        <div className="about-institutional-container">
          <div className="about-institutional-orbit">IINM<span>ACADEMY</span></div>
          <p className="about-institutional-eyebrow">THE IINM METHOD</p>
          <h2>From first curiosity to confident capability.</h2>
          <p className="about-institutional-pathways-intro">A connected learning pathway designed to turn curiosity into practical capability.</p>
          <div className="about-institutional-pathway-grid">
            {pathways.map((pathway, index) => (
              <article key={`${pathway.title}-${index}`} className="about-institutional-pathway-card">
                <div className="about-institutional-pathway-card-top">
                  <span className="about-institutional-pathway-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="about-institutional-pathway-step">Step {String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{pathway.title}</h3>
                <p>{pathway.description}</p>
                <span className="about-institutional-pathway-arrow" aria-hidden="true">→</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-institutional-compare">
        <div className="about-institutional-container about-institutional-compare-grid">
          <div className="about-institutional-difference-video-wrap">
            {differenceVideoUrl ? (
              <iframe
                className="about-institutional-difference-video"
                src={toYouTubeEmbedUrl(differenceVideoUrl) || undefined}
                title="The Difference at IINM"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="about-institutional-difference-video-empty">Add a section video from the editor</div>
            )}
          </div>
          <div className="about-institutional-compare-copy">
            <p className="about-institutional-eyebrow">{settings.difference_eyebrow || ""}</p>
            <h2>{settings.difference_title || ""}</h2>
            <div className="about-institutional-table-wrap">
              <table className="about-institutional-table">
                <thead>
                  <tr>
                    <th>{settings.difference_at_iinm_heading || ""}</th>
                    <th>{settings.difference_traditional_heading || ""}</th>
                  </tr>
                </thead>
                <tbody>
                  {differenceRows.map((row, index) => (
                    <tr key={`${row.at_iinm || "row"}-${index}`}>
                      <td>{row.at_iinm || ""}</td>
                      <td>{row.traditional || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("purpose")}>Edit The Difference</button>}
          </div>
        </div>
      </section>

      <section className="about-institutional-journey">
        <div className="about-institutional-container">
          <p className="about-institutional-eyebrow">OUR JOURNEY</p>
          <h2>Small steps. Significant milestones.</h2>
          <div className="about-institutional-journey-grid">
            {timeline.slice(0, 4).map((item, index) => (
              <article key={item.id} className="about-institutional-journey-card">
                <span>{item.year || `0${index + 1}`}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("timeline")}>Edit Journey</button>}
        </div>
      </section>

      <section className="about-institutional-founders">
        <div className="about-institutional-container">
          <p className="about-institutional-eyebrow">MEET OUR FOUNDERS</p>
          <h2>People with a point of view.</h2>
          <div className="about-institutional-founder-grid">
            {founders.map((founder, index) => <FounderCard key={founder.name || index} founder={founder} founderKey={`f${index + 1}`} videoPlay={videoPlay} getAssetUrl={getAssetUrl} onPlayFounder={onPlayFounder} />)}
          </div>
          {founders.length === 0 && <p className="about-institutional-empty">Founder profiles will appear here when they are configured in the CMS.</p>}
          {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("founders")}>Edit Founders</button>}
        </div>
      </section>

      <section className="about-institutional-alumni">
        <div className="about-institutional-container about-institutional-narrow">
          <p className="about-institutional-eyebrow">{settings.alumni_eyebrow || ""}</p>
          <h2>{settings.alumni_title || ""}</h2>
          <p>{settings.alumni_description || ""}</p>
          <div className="about-institutional-logo-strips">
            <AlumniLogoStrip logos={extended.alumni_logos || []} getAssetUrl={getAssetUrl} />
            <AlumniLogoStrip logos={extended.alumni_logos || []} getAssetUrl={getAssetUrl} reverse />
          </div>
          {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("alumni")}>Edit Alumni Logos</button>}
        </div>
      </section>

      <section className="about-institutional-spotlight">
        <div className="about-institutional-container">
          <div className="about-institutional-spotlight-heading">
            <p className="about-institutional-eyebrow">IINM IN THE SPOTLIGHT</p>
            <h2>Built by educators and practitioners</h2>
          </div>
          {(extended.gallery?.length || 0) > 0 ? (
            <div className="about-institutional-spotlight-marquee">
              <div className="about-institutional-spotlight-track">
                {[...(extended.gallery || []), ...(extended.gallery || [])].map((item, index) => (
                  <Image
                    key={`${item.id || index}-${index}`}
                    src={resolveImage(getAssetUrl, item.image_url)}
                    alt={item.caption || "IINM in the spotlight"}
                    width={320}
                    height={240}
                    unoptimized
                    className="about-institutional-spotlight-cutout"
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="about-institutional-empty">Spotlight media cutouts will appear here when gallery images are added in the CMS.</p>
          )}
          {isAdmin && <button className="about-institutional-edit" type="button" onClick={() => onEdit("who")}>Edit Spotlight Images</button>}
        </div>
      </section>

      <section className="about-institutional-cta">
        <div className="about-institutional-container">
          <p>Ready to find your next chapter?</p>
          <Link href="/contact-us" className="about-institutional-cta-link">Talk to IINM <ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}
