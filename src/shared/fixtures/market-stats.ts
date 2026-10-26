/**
 * Estatísticas de exemplo para a Home — NÃO são métricas reais.
 * Substituir quando houver agregações vindas da API.
 */
export type FixtureMarketStats = {
  /** @fixture */
  verifiedStores: number;
  /** @fixture */
  listedVehicles: number;
  /** @fixture */
  cities: number;
};

export const fixtureMarketStats: FixtureMarketStats = {
  verifiedStores: 10,
  listedVehicles: 32,
  cities: 10,
};
