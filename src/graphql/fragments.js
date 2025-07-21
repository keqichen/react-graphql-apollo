import { gql } from '@apollo/client';

export const CHARACTER_FRAGMENT = gql`
  fragment CharacterInfo on Character {
    id
    name
    status
    species
    type
    gender
    image
    origin {
      name
    }
    location {
      name
    }
  }
`;