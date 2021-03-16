import { Injectable } from '@angular/core';
import { AdapterBase, Polkadapt, PolkadaptRunConfig } from '@polkadapt/core';
import * as substrate from '@polkadapt/substrate-rpc';
import * as polkascan from '@polkadapt/polkascan';
import { AppConfig } from '../app-config';

export type AugmentedApi = substrate.Api & polkascan.Api;

@Injectable({providedIn: 'root'})
export class PolkadaptService {
  polkadapt: Polkadapt<AugmentedApi>;
  run: (config?: PolkadaptRunConfig | string) => AugmentedApi;
  availableAdapters: { [network: string]: { [source: string]: AdapterBase } } = {};

  constructor(private config: AppConfig) {
    this.setAvailableAdapters();
    this.polkadapt = new Polkadapt();
    this.run = this.polkadapt.run.bind(this.polkadapt);
  }

  setAvailableAdapters(): void {
    for (const network of Object.keys(this.config.networks)) {
      this.availableAdapters[network] = {
        substrateRPC: new substrate.Adapter({
          chain: network,
          providerURL: this.config.networks[network].substrateRpcUrl
        }),
        polkascanAPI: new polkascan.Adapter({
          chain: network,
          apiEndpoint: this.config.networks[network].polkascanApiUrl,
          wsEndpoint: this.config.networks[network].polkascanWsUrl
        })
      };
    }
  }

  async setNetwork(network: string): Promise<boolean> {
    if (this.polkadapt) {  // TODO Why this check? Can we remove it?
      // Remove active adapters.
      this.clearNetwork();

      if (!this.availableAdapters.hasOwnProperty(network)) {
        return Promise.reject(`There are no adapters for network '${network}'.`);
      }

      // Add new adapters.
      this.polkadapt.register(...Object.values(this.availableAdapters[network]));
      return this.polkadapt.ready();
    }

    return Promise.reject(false);
  }

  clearNetwork(): void {
    this.polkadapt.unregister();
  }
}
