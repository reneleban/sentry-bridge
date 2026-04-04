// CJS-compatible stub for digest-fetch (ESM package, not loadable in Jest/CommonJS)
class DigestClient {
  fetch(_url: string, _opts?: RequestInit): Promise<Response> {
    throw new Error(
      "DigestClient.fetch called without mock — inject HttpFetcher in tests"
    );
  }
}

export default DigestClient;
module.exports = DigestClient;
module.exports.default = DigestClient;
