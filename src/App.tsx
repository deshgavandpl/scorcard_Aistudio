import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import LiveScore from './pages/LiveScore';
import MatchScoring from './pages/MatchScoring';
import TournamentList from './pages/TournamentList';
import TournamentSetup from './pages/TournamentSetup';
import TournamentDetail from './pages/TournamentDetail';
import LiveMatchView from './pages/LiveMatchView';
import Stats from './pages/Stats';
import Teams from './pages/Teams';
import Settings from './pages/Settings';
import UserGuide from './pages/UserGuide';
import { PlayerProfileProvider } from './context/PlayerProfileContext';
import { TutorialProvider } from './context/TutorialContext';
import PlayerProfileModal from './components/PlayerProfileModal';
import AnnouncementOverlay from './components/AnnouncementOverlay';
import TutorialOverlay from './components/TutorialOverlay';

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <TutorialProvider>
        <PlayerProfileProvider>
          <PlayerProfileModal />
          <AnnouncementOverlay />
          <TutorialOverlay />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live" element={<LiveScore />} />
              <Route path="/match/:id" element={<LiveMatchView />} />
              <Route path="/admin/match/:id" element={<MatchScoring />} />
              <Route path="/tournaments" element={<TournamentList />} />
              <Route path="/tournaments/new" element={<TournamentSetup />} />
              <Route path="/tournament/:id" element={<TournamentDetail />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<UserGuide />} />
            </Routes>
          </Layout>
        </PlayerProfileProvider>
      </TutorialProvider>
    </Router>
  );
}
