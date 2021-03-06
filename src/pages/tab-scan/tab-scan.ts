import { Component, ViewChild } from '@angular/core'
import { AlertController, IonicPage, NavController, Platform } from 'ionic-angular'
import { Transaction } from '../../models/transaction.model'
import { ScannerProvider } from '../../providers/scanner/scanner'
import { TransactionsProvider } from '../../providers/transactions/transactions'
import { SecretsProvider } from '../../providers/secrets/secrets.provider'
import { SchemeRoutingProvider } from '../../providers/scheme-routing/scheme-routing'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { PermissionsProvider, PermissionTypes, PermissionStatus } from '../../providers/permissions/permissions'
import { TranslateService } from '@ngx-translate/core'

@IonicPage()
@Component({
  selector: 'page-tab-scan',
  templateUrl: 'tab-scan.html'
})
export class TabScanPage {
  @ViewChild('scanner')
  zxingScanner: ZXingScannerComponent
  availableDevices: MediaDeviceInfo[]
  selectedDevice: MediaDeviceInfo
  scannerEnabled = true

  public isBrowser = false

  hasCameras = false

  private webscanner: any
  private selectedCamera

  public hasCameraPermission = false

  constructor(
    private schemeRouting: SchemeRoutingProvider,
    private alertCtrl: AlertController,
    private navController: NavController,
    private platform: Platform,
    private secretsProvider: SecretsProvider,
    private transactionProvider: TransactionsProvider,
    private scanner: ScannerProvider,
    private permissionsProvider: PermissionsProvider,
    private translateService: TranslateService
  ) {
    this.isBrowser = !this.platform.is('cordova')
  }

  async ionViewWillEnter() {
    if (this.platform.is('cordova')) {
      await this.platform.ready()
      await this.checkCameraPermissionsAndActivate()
    }
  }

  async requestPermission() {
    await this.permissionsProvider.userRequestsPermissions([PermissionTypes.CAMERA])
    await this.checkCameraPermissionsAndActivate()
  }

  async checkCameraPermissionsAndActivate() {
    const permission = await this.permissionsProvider.hasCameraPermission()
    if (permission === PermissionStatus.GRANTED) {
      this.hasCameraPermission = true
      this.startScan()
    }
  }

  ionViewDidEnter() {
    if (!this.platform.is('cordova')) {
      this.hasCameraPermission = true
      this.zxingScanner.camerasNotFound.subscribe((devices: MediaDeviceInfo[]) => {
        console.error('An error has occurred when trying to enumerate your video-stream-enabled devices.')
      })
      if (this.selectedDevice) {
        // Not the first time that we open scanner
        this.zxingScanner.startScan(this.selectedDevice)
      }
      this.zxingScanner.camerasFound.subscribe((devices: MediaDeviceInfo[]) => {
        this.hasCameras = true
        this.availableDevices = devices
        this.selectedDevice = devices[0]
      })
    }
  }

  ionViewWillLeave() {
    if (this.platform.is('cordova')) {
      this.scanner.destroy()
    } else {
      this.zxingScanner.resetCodeReader()
    }
  }

  public startScan() {
    if (this.platform.is('cordova')) {
      this.scanner.show()
      this.scanner.scan(
        text => {
          this.checkScan(text)
        },
        error => {
          console.warn(error)
          this.startScan()
        }
      )
    } else {
      // We don't need to do anything in the browser because it keeps scanning
    }
  }

  async checkScan(data: string) {
    if (this.isAirGapTx(data)) {
      return this.schemeRouting.handleNewSyncRequest(this.navController, data, () => {
        this.startScan()
      })
    } else {
      this.extractRawTx(data)
        .then(tx => {
          // this.transactionScanned(tx)
        })
        .catch(error => {
          console.warn(error)
          this.translateService
            .get(['tab-wallets.no-secret_alert.title', 'tab-wallets.no-secret_alert.message', 'tab-wallets.no-secret_alert.text'])
            .subscribe(values => {
              let title = values['tab-wallets.no-secret_alert.title']
              let message = values['tab-wallets.no-secret_alert.message']
              let text = values['tab-wallets.no-secret_alert.text']
              let alert = this.alertCtrl.create({
                title: title,
                message: message,
                enableBackdropDismiss: false,
                buttons: [
                  {
                    text: text,
                    role: 'cancel',
                    handler: () => {
                      this.startScan()
                    }
                  }
                ]
              })
              alert.present()
            })
        })
    }
  }

  isAirGapTx(qr: string): boolean {
    return qr.indexOf('airgap-vault://') !== -1
  }

  extractRawTx(qr: string): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      this.translateService.get(['tab-wallets.raw-tx_alert']).subscribe(values => {
        let rawTx

        try {
          rawTx = JSON.parse(qr)
        } catch (err) {
          return reject(err)
        }
        let title = values['tab-wallets.raw-tx_alert.title']
        let text = values['tab-wallets.raw-tx_alert.okay_label']
        let alert = this.alertCtrl.create()
        alert.setTitle(title)

        const wallets = this.secretsProvider.getWallets()

        for (let wallet of wallets) {
          alert.addInput({
            type: 'radio',
            label: wallet.coinProtocol.name + ' ' + wallet.receivingPublicAddress,
            value: wallets.indexOf(wallet).toString()
          })
        }

        alert.addButton('Cancel')
        alert.addButton({
          text: text,
          handler: (walletIndex: string) => {
            const wallet = wallets[parseInt(walletIndex, 10)]
            rawTx.from = wallet.receivingPublicAddress
            const payload = rawTx

            try {
              const tx = this.transactionProvider.constructFromPayload(payload, wallet)
              resolve(tx)
            } catch (error) {
              return reject(error)
            }
          }
        })
        alert.present()
      })
    })
  }
}
