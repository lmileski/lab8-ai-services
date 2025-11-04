// read keys from localStorage and optionally use a proxy.

export const config = {
  // saved by the controller under this key
  GEMINI_KEY: typeof window !== 'undefined' ? (localStorage.getItem('ai_gemini_api_key') || '') : '',
  // set to proxy URL to route cloud requests (leave empty to call direct)
  LOCAL_PROXY: ''
};