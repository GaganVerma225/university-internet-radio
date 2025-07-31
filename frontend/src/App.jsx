import {BrowserRouter as Router,Route,Routes} from 'react-router-dom';
import './App.css'
import HomePage from "./home.jsx"
import BroadcasterPage from "./broadcaster.jsx"
import Admin from "./admin.jsx"

function App() {

  return (
    <Router>
      <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/broadcaster" element={<BroadcasterPage />} />
          <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
