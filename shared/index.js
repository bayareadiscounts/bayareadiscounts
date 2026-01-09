const { createCache } = require('./cache');
const { ApiClient, DEFAULT_BASE_URL } = require('./api-client');
const { translateTexts, DEFAULT_TRANSLATE_ENDPOINT } = require('./translation');

module.exports = {
  createCache,
  ApiClient,
  DEFAULT_BASE_URL,
  translateTexts,
  DEFAULT_TRANSLATE_ENDPOINT,
};
