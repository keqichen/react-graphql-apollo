import React from 'react';
import { useQuery, gql } from '@apollo/client';

const GET_CHARACTER = gql`
  query GetCharacter {
    character(id: 1) {
      id
      name
      status
    }
  }
`;

const SimpleTest = () => {
  const { loading, error, data } = useQuery(GET_CHARACTER);

  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Data:', data);

  if (loading) return <p>Loading...</p>;
  
  if (error) {
    return (
      <div>
        <h2>❌ Error occurred</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>✅ Success!</h2>
      <p>Character: {data.character.name}</p>
      <p>Status: {data.character.status}</p>
    </div>
  );
};

export default SimpleTest;