/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2021 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { PolkadaptService } from '../../../../../services/polkadapt.service';
import { NetworkService } from '../../../../../services/network.service';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import * as pst from '@polkadapt/polkascan/lib/polkascan.types';
import { PaginatedListComponentBase } from '../../../../../components/list-base/paginated-list-component-base.directive';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-extrinsic-list',
  templateUrl: './extrinsic-list.component.html',
  styleUrls: ['./extrinsic-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicListComponent extends PaginatedListComponentBase<pst.Extrinsic> implements OnInit, OnDestroy {
  listSize = 100;

  signedControl: FormControl = new FormControl(true);
  addressControl: FormControl = new FormControl('');
  filtersFormGroup: FormGroup = new FormGroup({
    signed: this.signedControl,
    multiAddressAccountId: this.addressControl
  });

  visibleColumns = ['icon', 'extrinsicID', 'block', 'pallet', 'call', 'signed', 'details'];

  constructor(private ns: NetworkService,
              private pa: PolkadaptService,
              private route: ActivatedRoute) {
    super(ns);
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      takeUntil(this.destroyer),
      map((params) => params.get('address') || ''),
      distinctUntilChanged()
    ).subscribe((address) => {
      if (address) {
        address = u8aToHex(decodeAddress(address));
      }
      this.addressControl.setValue(address);
    });

    this.filtersFormGroup.valueChanges
      .pipe(
        takeUntil(this.destroyer)
      )
      .subscribe(() => {
        this.items = [];
        this.subscribeNewItem();
        this.getItems();
      });

    super.ngOnInit();
  }


  createGetItemsRequest(pageKey?: string): Promise<pst.ListResponse<pst.Extrinsic>> {
    return this.pa.run(this.network).polkascan.chain.getExtrinsics(
      this.filters,
      this.listSize,
      pageKey
    );
  }


  createNewItemSubscription(handleItemFn: (item: pst.Extrinsic) => void): Promise<() => void> {
    return this.pa.run(this.network).polkascan.chain.subscribeNewExtrinsic(
      this.filters,
      handleItemFn
    );
  }


  sortCompareFn(a: pst.Extrinsic, b: pst.Extrinsic): number {
    return b.blockNumber - a.blockNumber || b.extrinsicIdx - a.extrinsicIdx;
  }


  equalityCompareFn(a: pst.Extrinsic, b: pst.Extrinsic): boolean {
    return a.blockNumber === b.blockNumber && a.extrinsicIdx === b.extrinsicIdx;
  }


  get filters(): any {
    const filters: any = {};
    if (this.signedControl.value === true) {
      // If true, singed only is being set. There is no need for a not signed check.
      filters.signed = 1;
    }
    if (this.addressControl.value) {
      filters.multiAddressAccountId = this.addressControl.value;
    }

    return filters;
  }


  track(i: any, extrinsic: pst.Extrinsic): string {
    return `${extrinsic.blockNumber}-${extrinsic.extrinsicIdx}`;
  }
}
