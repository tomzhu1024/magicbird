import $ from 'jquery';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, AppConfigKeys } from '@/utils/appConfig';
import { waitUntil } from '@/utils/waitUntil';
import { hotpToken, hotpOptions } from '@otplib/core';
import { createDigest } from '@otplib/plugin-crypto-js';

const preventDefaultAuth = async () => {
  // detect if automatically pushed
  if (await waitUntil(() => $('div#messages-view button.btn-cancel').length !== 0, 2000)) {
    $('div#messages-view button.btn-cancel').trigger('click');
    await waitUntil(() => $('div#messages-view button.btn-dismiss').length !== 0);
    $('div#messages-view button.btn-dismiss').trigger('click');
  }
};

$(window).one('load', async () => {
  // is in MFA Setup mode
  if ((await AppConfig.get(AppConfigKeys.mfaSetupEnabled)) === true) {
    let elements: JQuery;

    // device select page, select the second option `Tablet`
    if ($('#device-question').length !== 0) {
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showGuideLoading' });
      $('fieldset > label:nth-child(3)').trigger('click');
      $('#continue').trigger('click');
      return;
    }

    // device type select page, select the second option `Android`
    if ($('#device-type-prompt').length !== 0) {
      $('fieldset > label:nth-child(3)').trigger('click');
      $('#continue').trigger('click');
      return;
    }

    // mobile app confirm page
    if ((elements = $('#duo-installed')).length !== 0) {
      elements.trigger('click');
      return;
    }

    // QR code page, activate device
    if ((elements = $('.qr-container > .qr')).length !== 0) {
      const qrData = elements.attr('src').split('qr?value=')[1];
      const url = 'https://' + window.atob(qrData.split('-')[1]) + '/push/v2/activation/' + qrData.split('-')[0];
      const response = await new Promise<Record<string, never>>((resolve) => {
        chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'registerMfa', url }, resolve);
      });
      if (response.from !== 'background' || response.action !== 'registerMfa' || response.status !== true) {
        // failed to get secret, terminate MFA Setup
        chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'hideGuideLoading' });
        chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showFailed' });
        await AppConfig.set(AppConfigKeys.mfaSetupEnabled, false);
        return;
      }
      await AppConfig.set(AppConfigKeys.mfaHOTPSecret, response.secret);
      await AppConfig.set(AppConfigKeys.mfaHOTPCount, 0);
      await waitUntil(() => $('.qr-container > .ss-check').length !== 0);
      $('#continue').trigger('click');
      return;
    }

    // control panel with new device, configure device
    if ($('div.device-bar.new-device').length !== 0) {
      // rename device
      const deviceName = `MagicBird_${uuidv4().slice(0, 4)}`;
      $('div.device-bar.new-device button.expand-options').trigger('click');
      $('div.device-bar.new-device button.change-device-name').trigger('click');
      $('div.device-bar.new-device div.edit-name-container input').val(deviceName);
      $('div.device-bar.new-device button.edit-submit').trigger('click');
      $('div.device-bar.new-device button.collapse-options').trigger('click').hide();
      await waitUntil(() => $('div.message-content > button.btn-dismiss').length !== 0);
      $('div.message-content > button.btn-dismiss').trigger('click');

      // disable default auth method
      // TODO: this operation is not effective
      $('div.select-auto-auth select#factor').val($('div.select-auto-auth #factor option').val()).trigger('change');
      $('#saved').trigger('click');

      await AppConfig.set(AppConfigKeys.mfaDeviceName, deviceName);
      await AppConfig.set(AppConfigKeys.mfaSetupEnabled, false);
      await AppConfig.set(AppConfigKeys.mfaHelperEnabled, true);
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'hideGuideLoading' });
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showSucceeded' });
      return;
    }

    // start page, click `Add New Device`
    // lowest priority, because this element always presents
    if ((elements = $('#new-device')).length !== 0 && $('#header-title').length === 0) {
      elements.get(0).click();
      return;
    }
    return;
  }

  // is in MFA Helper mode
  if ((await AppConfig.get(AppConfigKeys.mfaHelperEnabled)) === true) {
    chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showMask' });

    // try to prevent default auth method
    await preventDefaultAuth();

    const deviceOptions = $('fieldset.device-selector select > option');
    let deviceSet = false;
    for (let i = 0; i < deviceOptions.length; i++) {
      if (deviceOptions.get(i).innerText.startsWith((await AppConfig.get(AppConfigKeys.mfaDeviceName)) as string)) {
        $('fieldset.device-selector select').val(deviceOptions.get(i).getAttribute('value'));
        deviceSet = true;
        break;
      }
    }
    if (!deviceSet) {
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'hideMask' });
      return;
    }
    $('label.remember_me_label_field input').prop('checked', false);
    $('div.passcode-label button#passcode').trigger('click');
    const token = hotpToken(
      (await AppConfig.get(AppConfigKeys.mfaHOTPSecret)) as string,
      (await AppConfig.get(AppConfigKeys.mfaHOTPCount)) as number,
      hotpOptions({ createDigest, digits: 6 })
    );
    $('div.passcode-label input.passcode-input').val(token);
    $('div.passcode-label button#passcode').trigger('click');
    await AppConfig.set(
      AppConfigKeys.mfaHOTPCount,
      (((await AppConfig.get(AppConfigKeys.mfaHOTPCount)) || 0) as number) + 1
    );
    await AppConfig.set(
      AppConfigKeys.mfaTotalCount,
      (((await AppConfig.get(AppConfigKeys.mfaTotalCount)) || 0) as number) + 1
    );
    return;
  }
});
