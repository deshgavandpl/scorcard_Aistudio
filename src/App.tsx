import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Router>
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
        </Routes>
      </Layout>
    </Router>
  );
}
