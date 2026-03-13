import { useState } from 'react';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import LinksPage from './components/LinksPage';

type Page = 'landing' | 'about' | 'links';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  return (
    <div className="transition-opacity duration-300">
      {page === 'landing' ? (
        <LandingPage onEnter={() => setPage('about')} />
      ) : page === 'about' ? (
        <AboutPage
          onBack={() => setPage('landing')}
          onGetStarted={() => setPage('links')}
        />
      ) : (
        <LinksPage onBack={() => setPage('about')} />
      )}
    </div>
  );
}
