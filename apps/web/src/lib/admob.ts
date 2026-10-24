import { Capacitor } from "@capacitor/core"
import { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob"

const androidTestBannerId = "ca-app-pub-3940256099942544/6300978111"
const androidBannerId = "ca-app-pub-1230612615908063/3002509721"
const useTestAds = import.meta.env.VITE_ADMOB_USE_TEST_ADS !== "false"

let initialized = false
let bannerVisible = false

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"
}

export async function showAdMobBanner() {
  if (!isNativeAndroid() || bannerVisible) return

  try {
    let consent = await AdMob.requestConsentInfo()
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm()
    }
    if (!consent.canRequestAds) return

    if (!initialized) {
      await AdMob.initialize({ initializeForTesting: useTestAds })
      initialized = true
    }

    await AdMob.showBanner({
      adId: useTestAds ? androidTestBannerId : androidBannerId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: useTestAds,
      margin: 0,
    })
    bannerVisible = true
  } catch {
    // Ads must never prevent the app from loading when inventory or consent is unavailable.
  }
}

export async function removeAdMobBanner() {
  if (!isNativeAndroid() || !bannerVisible) return

  try {
    await AdMob.removeBanner()
  } catch {
    // The banner can already have been removed by the native activity.
  } finally {
    bannerVisible = false
  }
}
