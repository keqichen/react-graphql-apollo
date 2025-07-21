import React from 'react';
import './App.css';
import SimpleTest from './components/SimpleTest';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Apollo Client Test</h1>
      </header>
      <main>
        <SimpleTest />
      </main>
    </div>
  );
}

export default App;