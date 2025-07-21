import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: 'https://rickandmortyapi.com/graphql',
});

// Enhanced cache with type policies
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Merge strategy for paginated characters
        characters: {
          keyArgs: ["filter"], // Cache separately for different filters
          merge(existing, incoming, { args }) {
            const merged = existing ? existing.results.slice(0) : [];
            if (incoming) {
              merged.push(...incoming.results);
            }
            return {
              ...incoming,
              results: merged
            };
          }
        }
      }
    },
    Character: {
      keyFields: ['id'],
      fields: {
        // Client-side field for favorites
        isFavorite: {
          read(existing = false) {
            return existing;
          }
        }
      }
    }
  }
});

const client = new ApolloClient({
  link: httpLink,
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    }
  }
});

export default client;