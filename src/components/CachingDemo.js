// CachingDemo.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  gql,
  useApolloClient,
  useLazyQuery,
  useQuery,
  NetworkStatus,
} from '@apollo/client';
import {
  GET_CHARACTERS,
  GET_CHARACTER_DETAIL,
  GET_RANDOM_CHARACTER,
} from '../graphql/queries';

const MIN_CHAR_FRAGMENT = gql`
  fragment MinChar on Character {
    id
    name
    image
  }
`;

function CachingDemo() {
  const [fetchPolicy, setFetchPolicy] = useState('cache-first');
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

  // Perf metrics
  const [ttfdMs, setTtfdMs] = useState(null); // Time To First Data (cache or network)
  const [ttfnMs, setTtfnMs] = useState(null); // Time To Network Complete (networkStatus === 7)
  const startTimeRef = useRef(null);
  const sawFirstDataRef = useRef(false);

  // Was the detail minimally cached at click time?
  const [wasCachedAtClick, setWasCachedAtClick] = useState(null);

  // Cache dump (expensive) is behind a button
  const [dumpCacheJson, setDumpCacheJson] = useState(null);
  // const [cacheVersion, setCacheVersion] = useState(0); // bump when cache known to change

  const client = useApolloClient();

  // Characters list
  const {
    data: charactersData,
    loading: charactersLoading,
    refetch,
    networkStatus: listNetworkStatus,
  } = useQuery(GET_CHARACTERS, {
    variables: { page: 1 },
    fetchPolicy,
    notifyOnNetworkStatusChange: true,
  });

  // Character detail
  const {
    data: detailData,
    loading: detailLoading,
    networkStatus: detailNetworkStatus,
  } = useQuery(GET_CHARACTER_DETAIL, {
    variables: { id: selectedCharacterId },
    skip: !selectedCharacterId,
    fetchPolicy,
    notifyOnNetworkStatusChange: true,
  });

  // Random character (lazy)
  const [
    loadRandomCharacter,
    { data: randomData, loading: randomLoading, networkStatus: randomNetworkStatus },
  ] = useLazyQuery(GET_RANDOM_CHARACTER, {
    fetchPolicy,
    notifyOnNetworkStatusChange: true,
  });

  // Helpers: click handlers & metrics
  const beginMeasure = () => {
    startTimeRef.current = Date.now();
    setTtfdMs(null);
    setTtfnMs(null);
    sawFirstDataRef.current = false;
    setDumpCacheJson(null);
  };

  const handleCharacterClick = (id) => {
    const cacheId = client.cache.identify({ __typename: 'Character', id });
    const cached = cacheId
      ? !!client.readFragment({ id: cacheId, fragment: MIN_CHAR_FRAGMENT })
      : false;
    setWasCachedAtClick(cached);

    beginMeasure();
    setSelectedCharacterId(id);
  };

  const handleRandomCharacter = () => {
    const randomId = Math.floor(Math.random() * 826) + 1; // Rick & Morty ~826+ characters
    const idStr = String(randomId);

    const cacheId = client.cache.identify({ __typename: 'Character', id: idStr });
    const cached = cacheId
      ? !!client.readFragment({ id: cacheId, fragment: MIN_CHAR_FRAGMENT })
      : false;
    setWasCachedAtClick(cached);

    beginMeasure();
    loadRandomCharacter({ variables: { id: idStr } });
  };

  const clearCache = async () => {
    await client.cache.reset();
    setSelectedCharacterId(null);
    setTtfdMs(null);
    setTtfnMs(null);
    setWasCachedAtClick(null);
    setDumpCacheJson(null);
  };

  // Measure: Time To First Data (cache or network)
  useEffect(() => {
    const nowHasDetail = !!detailData?.character;
    const nowHasRandom = !!randomData?.character;
    const hasFirstData = nowHasDetail || nowHasRandom;

    if (!sawFirstDataRef.current && hasFirstData && startTimeRef.current) {
      setTtfdMs(Date.now() - startTimeRef.current);
      sawFirstDataRef.current = true;
    }
  }, [detailData, randomData]);

  // Measure: Time To Final Network (NetworkStatus.ready === 7)
  useEffect(() => {
    const detailReady = detailNetworkStatus === NetworkStatus.ready;
    const randomReady = randomNetworkStatus === NetworkStatus.ready;

    if ((detailReady || randomReady) && startTimeRef.current) {
      setTtfnMs(Date.now() - startTimeRef.current);
    }
  }, [detailNetworkStatus, randomNetworkStatus]);

  return (
    <div className="caching-demo">
      <div className="demo-header">
        <h1>🧠 Apollo Client Caching Demo</h1>
        <p>Compare fetch policies using the Rick & Morty GraphQL API</p>
      </div>

      {/* Controls */}
      <div className="demo-controls">
        <div className="control-group">
          <label>Fetch Policy:</label>
          <select
            value={fetchPolicy}
            onChange={(e) => setFetchPolicy(e.target.value)}
          >
            <option value="cache-first">Cache First (Default)</option>
            <option value="cache-and-network">Cache and Network</option>
            <option value="network-only">Network Only</option>
            <option value="no-cache">No Cache</option>
            <option value="cache-only">Cache Only</option>
          </select>
        </div>

        <button onClick={() => refetch()} disabled={charactersLoading}>
          {charactersLoading ? 'Loading…' : 'Refetch Characters'}
        </button>

        <button onClick={handleRandomCharacter} disabled={randomLoading}>
          {randomLoading ? 'Loading…' : 'Load Random Character'}
        </button>

        <button onClick={clearCache} className="danger">
          Clear Cache
        </button>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <div className="stat-card">
          <h3>Time to Display Data</h3>
          <span className="stat-value">
            {ttfdMs == null ? 'N/A' : `${ttfdMs} ms`}
          </span>
        </div>
        <div className="stat-card">
          <h3>Time to Network Complete</h3>
          <span className="stat-value">
            {ttfnMs == null ? 'N/A' : `${ttfnMs} ms`}
          </span>
        </div>
        <div className="stat-card">
          <h3>Was Cached at Click?</h3>
          <span className="stat-value">
            {wasCachedAtClick == null ? 'N/A' : wasCachedAtClick ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Policy Explanation */}
      <div className="policy-explanation">
        <h3>
          Current Policy: <code>{fetchPolicy}</code>
        </h3>
        <p>{getPolicyExplanation(fetchPolicy)}</p>
      </div>

      {/* Characters Grid */}
      <div className="demo-content">
        <div className="characters-section">
          <h2>
            Characters{' '}
            {charactersLoading || listNetworkStatus === NetworkStatus.refetch
              ? '(Loading…)'
              : ''}
          </h2>
          <div className="characters-grid">
            {charactersData?.characters.results.slice(0, 12).map((c) => (
              <div
                key={c.id}
                className={`character-card ${
                  selectedCharacterId === c.id ? 'selected' : ''
                }`}
                onClick={() => handleCharacterClick(c.id)}
              >
                <img src={c.image} alt={c.name} />
                <h4>{c.name}</h4>
                <span className={`status ${c.status?.toLowerCase?.()}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Character Detail */}
        {(detailData || randomData) && (
          <div className="character-detail">
            <h2>
              Character Detail{' '}
              {detailLoading || detailNetworkStatus === NetworkStatus.setVariables
                ? '(Loading…)'
                : ''}
            </h2>
            {renderCharacterDetail(detailData?.character || randomData?.character)}
          </div>
        )}
      </div>

      {/* Cache Visualization (on demand) */}
      {dumpCacheJson && (
        <div className="cache-visualization">
          <h3>Cache Contents (First 10 entries)</h3>
          <pre className="cache-preview">{dumpCacheJson}</pre>
        </div>
      )}
    </div>
  );
}

// Helpers
function getPolicyExplanation(policy) {
  const explanations = {
    'cache-first':
      'Reads from cache first; if missing, hits the network. Fastest to display data when data is cached.',
    'cache-and-network':
      'Returns cached data immediately (if any), then updates with network response.',
    'network-only':
      'Skips cache reads and always fetches from the network. Good for always-fresh data, slower to display',
    'no-cache':
      'Always fetches from the network and does not write to or read from cache. Good for raw network comparisons.',
    'cache-only':
      'Only reads from cache; errors if not present. No network activity.',
  };
  return explanations[policy] || 'Unknown policy';
}

function renderCharacterDetail(character) {
  if (!character) return null;
  return (
    <div className="detail-content">
      <img src={character.image} alt={character.name} />
      <div className="detail-info">
        <h3>{character.name}</h3>
        <p>
          <strong>Status:</strong> {character.status}
        </p>
        <p>
          <strong>Species:</strong> {character.species}
        </p>
        <p>
          <strong>Gender:</strong> {character.gender}
        </p>
        <p>
          <strong>Origin:</strong> {character.origin?.name}
        </p>
        <p>
          <strong>Location:</strong> {character.location?.name}
        </p>
        {character.episode && (
          <p>
            <strong>Episodes:</strong> {character.episode.length}
          </p>
        )}
      </div>
    </div>
  );
}

export default CachingDemo;
