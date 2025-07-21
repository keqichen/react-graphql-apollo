import { gql } from '@apollo/client';
import { CHARACTER_FRAGMENT } from './fragments';

export const GET_CHARACTERS = gql`
  ${CHARACTER_FRAGMENT}
  query GetCharacters($page: Int, $filter: FilterCharacter) {
    characters(page: $page, filter: $filter) {
      info {
        count
        pages
        next
        prev
      }
      results {
        ...CharacterInfo
      }
    }
  }
`;

export const GET_CHARACTER_DETAIL = gql`
  ${CHARACTER_FRAGMENT}
  query GetCharacterDetail($id: ID!) {
    character(id: $id) {
      ...CharacterInfo
      episode {
        id
        name
        episode
      }
    }
  }
`;

export const GET_EPISODES = gql`
  query GetEpisodes($page: Int) {
    episodes(page: $page) {
      info {
        count
        pages
      }
      results {
        id
        name
        episode
        air_date
        characters {
          id
          name
          image
        }
      }
    }
  }
`;

// For cache policy demonstrations
export const GET_RANDOM_CHARACTER = gql`
  query GetRandomCharacter($id: ID!) {
    character(id: $id) {
      id
      name
      status
      image
    }
  }
`;