// @version 0.6.0 - Beacon: Instagram Graph API types

/** Input for creating an Instagram media container */
export interface InstagramPost {
  imageUrl: string; // must be a publicly accessible URL
  caption: string;
}

/** Result from publishing a container */
export interface InstagramPublishResult {
  postId: string;
  permalink?: string;
}

/** Raw response from the Graph API container creation */
export interface InstagramContainerResponse {
  id: string;
}

/** Raw response from the Graph API publish endpoint */
export interface InstagramPublishResponse {
  id: string;
}

/** Raw Graph API error shape */
export interface InstagramApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}
