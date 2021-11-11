const AppConfigKeys = {
  mfaHelperEnabled: 'MFA_HELPER_ENABLED',
  mfaSetupEnabled: 'MFA_SETUP_ENABLED',
  mfaDeviceName: 'MFA_DEVICE_NAME',
  mfaHOTPSecret: 'MFA_HOTP_SECRET',
  mfaHOTPCount: 'MFA_HOTP_COUNT',
  mfaTotalCount: 'MFA_TOTAL_COUNT',
  autoLoginEnabled: 'AUTO_LOGIN_ENABLED',
  enrollmentHelperEnabled: 'ENROLLMENT_HELPER_ENABLED',
};

class AppConfig {
  static get = async (key: string): Promise<unknown> => {
    return new Promise<never>((resolve) => {
      chrome.storage.sync.get([key], (items) => {
        resolve(items[key]);
      });
    });
  };

  static set = async (key: string, value: unknown): Promise<void> => {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.set({ [key]: value }, resolve);
    });
  };
}

export { AppConfig, AppConfigKeys };
