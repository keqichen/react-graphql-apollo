import React, { useState, useEffect } from 'react';
import { useQuery, useApolloClient, useLazyQuery } from '@apollo/client';
import { GET_CHARACTERS, GET_CHARACTER_DETAIL, GET_RANDOM_CHARACTER } from '../graphql/queries';

const CachingDemo = () => {
  const [fetchPolicy, setFetchPolicy] = useState('cache-first');
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [queryStats, setQueryStats] = useState({ executed: 0, cached: 0 });
  const [startTime, setStartTime] = useState(null);
  const [responseTime, setResponseTime] = useState(null);

  const client = useApolloClient();

  // Main characters query
  const { data: charactersData, loading: charactersLoading, refetch } = useQuery(
    GET_CHARACTERS, 
    {
      variables: { page: 1 },
      fetchPolicy: fetchPolicy,
      notifyOnNetworkStatusChange: true,
      onQueryUpdated() {
        setQueryStats(prev => ({ ...prev, executed: prev.executed + 1 }));
      }
    }
  );

  // Character detail query
  const { data: detailData, loading: detailLoading } = useQuery(
    GET_CHARACTER_DETAIL,
    {
      variables: { id: selectedCharacterId },
      skip: !selectedCharacterId,
      fetchPolicy: fetchPolicy,
      onCompleted() {
        if (startTime) {
          setResponseTime(Date.now() - startTime);
        }
      }
    }
  );

  // Lazy query for random character (to demonstrate on-demand loading)
  const [loadRandomCharacter, { data: randomData, loading: randomLoading }] = useLazyQuery(
    GET_RANDOM_CHARACTER,
    { fetchPolicy: fetchPolicy }
  );

  const handleCharacterClick = (id) => {
    setStartTime(Date.now());
    setSelectedCharacterId(id);
  };

  const handleRandomCharacter = () => {
    const randomId = Math.floor(Math.random() * 826) + 1; // Rick & Morty has 826+ characters
    setStartTime(Date.now());
    loadRandomCharacter({ variables: { id: randomId.toString() } });
  };

  const getCacheStats = () => {
    const cache = client.cache.extract();
    const cacheString = JSON.stringify(cache);
    
    return {
      size: (cacheString.length / 1024).toFixed(2), // KB
      entries: Object.keys(cache).length,
      characters: Object.keys(cache).filter(key => key.startsWith('Character:')).length,
      queries: Object.keys(cache).filter(key => key.startsWith('ROOT_QUERY')).length
    };
  };

  const clearCache = () => {
    client.cache.reset();
    setQueryStats({ executed: 0, cached: 0 });
    setResponseTime(null);
  };

  const cacheStats = getCacheStats();

  return (
    <div className="caching-demo">
      <div className="demo-header">
        <h1>🧠 Apollo Client Caching Demo</h1>
        <p>Demonstrating cache policies with Rick and Morty GraphQL API</p>
      </div>

      {/* Controls */}
      <div className="demo-controls">
        <div className="control-group">
          <label>Fetch Policy:</label>
          <select value={fetchPolicy} onChange={(e) => setFetchPolicy(e.target.value)}>
            <option value="cache-first">Cache First (Default)</option>
            <option value="network-only">Network Only</option>
            <option value="cache-only">Cache Only</option>
            <option value="no-cache">No Cache</option>
            <option value="cache-and-network">Cache and Network</option>
          </select>
        </div>

        <button onClick={() => refetch()} disabled={charactersLoading}>
          {charactersLoading ? 'Loading...' : 'Refetch Characters'}
        </button>

        <button onClick={handleRandomCharacter} disabled={randomLoading}>
          {randomLoading ? 'Loading...' : 'Load Random Character'}
        </button>

        <button onClick={clearCache} className="danger">
          Clear Cache
        </button>
      </div>

      {/* Cache Statistics */}
      <div className="cache-stats">
        <div className="stat-card">
          <h3>Cache Size</h3>
          <span className="stat-value">{cacheStats.size} KB</span>
        </div>
        <div className="stat-card">
          <h3>Cached Objects</h3>
          <span className="stat-value">{cacheStats.entries}</span>
        </div>
        <div className="stat-card">
          <h3>Characters Cached</h3>
          <span className="stat-value">{cacheStats.characters}</span>
        </div>
        <div className="stat-card">
          <h3>Response Time</h3>
          <span className="stat-value">
            {responseTime ? `${responseTime}ms` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Policy Explanation */}
      <div className="policy-explanation">
        <h3>Current Policy: <code>{fetchPolicy}</code></h3>
        <p>{getPolicyExplanation(fetchPolicy)}</p>
      </div>

      {/* Characters Grid */}
      <div className="demo-content">
        <div className="characters-section">
          <h2>Characters {charactersLoading && '(Loading...)'}</h2>
          <div className="characters-grid">
            {charactersData?.characters.results.slice(0, 12).map(character => (
              <div 
                key={character.id} 
                className={`character-card ${selectedCharacterId === character.id ? 'selected' : ''}`}
                onClick={() => handleCharacterClick(character.id)}
              >
                <img src={character.image} alt={character.name} />
                <h4>{character.name}</h4>
                <span className={`status ${character.status.toLowerCase()}`}>
                  {character.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Character Detail */}
        {(detailData || randomData) && (
          <div className="character-detail">
            <h2>Character Detail {detailLoading && '(Loading...)'}</h2>
            {renderCharacterDetail(detailData?.character || randomData?.character)}
          </div>
        )}
      </div>

      {/* Cache Visualization */}
      <div className="cache-visualization">
        <h3>Cache Contents (First 10 entries)</h3>
        <pre className="cache-preview">
          {JSON.stringify(
            Object.fromEntries(
              Object.entries(client.cache.extract()).slice(0, 10)
            ), 
            null, 2
          )}
        </pre>
      </div>
    </div>
  );
};

// Helper functions
const getPolicyExplanation = (policy) => {
  const explanations = {
    'cache-first': 'Checks cache first, only makes network request if data not found. Best for performance.',
    'network-only': 'Always makes network request, ignores cache. Use for always-fresh data.',
    'cache-only': 'Only uses cached data, never makes network requests. Will error if data not cached.',
    'no-cache': 'Always makes network request and doesn\'t cache the result.',
    'cache-and-network': 'Returns cached data immediately, then updates with network data.'
  };
  return explanations[policy] || 'Unknown policy';
};

const renderCharacterDetail = (character) => {
  if (!character) return null;
  
  return (
    <div className="detail-content">
      <img src={character.image} alt={character.name} />
      <div className="detail-info">
        <h3>{character.name}</h3>
        <p><strong>Status:</strong> {character.status}</p>
        <p><strong>Species:</strong> {character.species}</p>
        <p><strong>Gender:</strong> {character.gender}</p>
        <p><strong>Origin:</strong> {character.origin.name}</p>
        <p><strong>Location:</strong> {character.location.name}</p>
        {character.episode && (
          <p><strong>Episodes:</strong> {character.episode.length}</p>
        )}
      </div>
    </div>
  );
};

export default CachingDemo;