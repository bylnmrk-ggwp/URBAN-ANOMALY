/**
 * Pexels CDN URL for a photo id. 900 wide for tiles and marquees, 1200 for promo / story
 * images, 1800 for hero slides. Kept local so the CMS domain does not import mock data.
 */
export const pexels = (id: string, w = 900) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`
