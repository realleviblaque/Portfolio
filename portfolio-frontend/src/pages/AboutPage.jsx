import { aboutProfile } from '../data/aboutProfile.js'
import { useProfileImage } from '../context/useProfileImage.js'

const sections = [
  ['01', 'Personal introduction', 'introduction'],
  ['02', 'Full biography', 'biography'],
  ['03', 'Background & journey', 'background'],
  ['04', 'Skills', 'skills'],
  ['05', 'Technologies', 'technologies'],
  ['06', 'Interests', 'interests'],
  ['07', 'Current activities', 'currentActivities'],
  ['08', 'Achievements', 'achievements'],
]

function ProfileContent({ content }) {
  if (Array.isArray(content)) {
    return content.length
      ? <ul className="profile-tags">{content.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
      : <p className="profile-empty">Details will be added when provided.</p>
  }
  return <p className="profile-empty">{content || 'Details will be added when provided.'}</p>
}

export function AboutPage() {
  const { profileImage } = useProfileImage()
  return (
    <main className="page about-page">
        <header className="about-masthead">
          <p className="eyebrow">A personal profile <span className="eyebrow-divider">/</span> 01</p>
          <h1>About<br /><span>Levi Blaque.</span></h1>
          <p className="page-description">Personal details and biography have not been provided yet.</p>
        </header>
        <section className="about-layout" aria-label="About information">
          <aside className="about-aside" aria-label="Profile identity">
            {profileImage?.src && <img className="about-portrait" src={profileImage.src} alt={profileImage.alt} style={{ objectPosition: `${profileImage.positionX}% ${profileImage.positionY}%`, transform: `scale(${profileImage.zoom})` }} />}
            <div className="about-aside-caption"><span>Profile</span><span>Levi Blaque</span></div>
          </aside>
          <div className="about-sections">
            {sections.filter(([, , key]) => key !== 'achievements' || aboutProfile.achievements.length > 0).map(([number, title, key]) => (
              <section className="about-row" key={number}>
                <span className="about-row-number">{number}</span>
                <h2>{title}</h2>
                <ProfileContent content={aboutProfile[key]} />
              </section>
            ))}
          </div>
        </section>
    </main>
  )
}
