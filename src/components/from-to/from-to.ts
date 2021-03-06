import { Component, Input } from '@angular/core'
import { Transaction } from '../../models/transaction.model'
import { NavParams } from 'ionic-angular'
import { AirGapWallet } from 'airgap-coin-lib'

@Component({
  selector: 'from-to',
  templateUrl: 'from-to.html'
})
export class FromToComponent {
  private from = ''

  @Input()
  transaction: Transaction

  @Input()
  wallet: AirGapWallet

  constructor(private navParams: NavParams) {}

  ngOnInit() {
    this.from = this.wallet.receivingPublicAddress
  }
}
