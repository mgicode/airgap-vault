import { Component } from '@angular/core'
import { AlertController, NavParams, ToastController, ViewController } from 'ionic-angular'
import { SecretsProvider } from '../../../providers/secrets/secrets.provider'
import { AirGapWallet } from 'airgap-coin-lib'
import { Clipboard } from '@ionic-native/clipboard'
import { TranslateService } from '@ngx-translate/core'

@Component({
  template: `
    <ion-list no-lines no-detail>
      <ion-list-header>{{ 'wallet-edit-delete-popover.settings_label' | translate }}</ion-list-header>
      <button ion-item detail-none (click)="copyAddressToClipboard()">
        <ion-icon name="clipboard" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-delete-popover.copy_label' | translate }}
      </button>
      <button ion-item detail-none (click)="delete()">
        <ion-icon name="trash" color="dark" item-end></ion-icon>
        {{ 'wallet-edit-delete-popover.account-removal_alert.delete_label' | translate }}
      </button>
    </ion-list>
  `
})
export class WalletEditPopoverComponent {
  private wallet: AirGapWallet
  private onDelete: Function

  constructor(
    private alertCtrl: AlertController,
    private clipboard: Clipboard,
    private toastController: ToastController,
    private navParams: NavParams,
    private secretsProvider: SecretsProvider,
    private viewCtrl: ViewController,
    private translateService: TranslateService
  ) {
    this.wallet = this.navParams.get('wallet')
    this.onDelete = this.navParams.get('onDelete')
  }

  async copyAddressToClipboard() {
    await this.clipboard.copy(this.wallet.receivingPublicAddress)
    let toast = this.toastController.create({
      message: 'Address was copied to your clipboard',
      duration: 2000,
      position: 'top',
      showCloseButton: true,
      closeButtonText: 'Ok'
    })
    await toast.present()
    await this.viewCtrl.dismiss()
  }

  delete() {
    this.translateService
      .get([
        'wallet-edit-delete-popover.account-removal_alert.title',
        'wallet-edit-delete-popover.account-removal_alert.text',
        'wallet-edit-delete-popover.account-removal_alert.cancel_label',
        'wallet-edit-delete-popover.account-removal_alert.delete_label'
      ])
      .subscribe(values => {
        let title = values['wallet-edit-delete-popover.account-removal_alert.title']
        let message = values['wallet-edit-delete-popover.account-removal_alert.text']
        let text1 = values['wallet-edit-delete-popover.account-removal_alert.cancel_label']
        let text2 = values['wallet-edit-delete-popover.account-removal_alert.delete_label']
        let alert = this.alertCtrl.create({
          title: title,
          message: message,
          buttons: [
            {
              text: text1,
              role: 'cancel',
              handler: () => {
                this.viewCtrl.dismiss()
              }
            },
            {
              text: text2,
              handler: () => {
                alert.present()
                this.secretsProvider.removeWallet(this.wallet).then(() => {
                  this.viewCtrl.dismiss()
                  if (this.onDelete) {
                    this.onDelete()
                  }
                })
              }
            }
          ]
        })
        alert.present()
      })
  }
}
