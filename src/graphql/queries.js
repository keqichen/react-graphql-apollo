import { gql } from '@apollo/client';

export const GET_LAUNCHES = gql`
  query GetLaunches($limit: Int) {
    launches(limit: $limit) {
      id
      mission_name
      launch_date_local
      launch_success
      rocket {
        rocket_name
      }
      links {
        mission_patch_small
      }
    }
  }
`;